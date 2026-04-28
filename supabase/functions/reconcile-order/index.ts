import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z
  .object({
    identifier: z.string().min(1).max(255).optional(),
    tx_reference: z.string().min(1).max(255).optional(),
    /** Optional explicit order id we want to reconcile (will be cross-checked with caller). */
    order_id: z.string().uuid().optional(),
  })
  .refine((d) => d.identifier || d.tx_reference || d.order_id, {
    message: "identifier, tx_reference ou order_id requis",
  });

type ReconcileState =
  | "success"
  | "pending"
  | "expired"
  | "failed"
  | "unknown"
  | "debited_pending_finalization"
  | "not_found"
  | "unauthorized";

function mapPaygateRaw(raw: any): {
  state: "success" | "pending" | "expired" | "failed" | "unknown";
  rawCode: string;
  amount?: number;
  paymentMethod?: string;
  paymentReference?: string;
} {
  const codeRaw = raw?.status ?? raw?.tx_status ?? null;
  const code = String(codeRaw ?? "").trim();
  const num = Number.isFinite(Number(code)) ? Number(code) : null;
  let state: "success" | "pending" | "expired" | "failed" | "unknown" = "unknown";
  if (num === 0 || code === "T" || code === "success") state = "success";
  else if (num === 2 || code === "pending") state = "pending";
  else if (num === 4 || code === "X" || code === "expired") state = "expired";
  else if (num === 6 || code === "F" || code === "failed" || code === "cancelled") state = "failed";

  const amount = raw?.amount != null ? Number(raw.amount) : undefined;
  return {
    state,
    rawCode: code,
    amount: Number.isFinite(amount) ? amount : undefined,
    paymentMethod: raw?.payment_method,
    paymentReference: raw?.payment_reference,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ success: false, state: "unauthorized" satisfies ReconcileState, user_message: "Non autorisé" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYGATE_API_KEY = Deno.env.get("PAYGATE_API_KEY") || "";

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonRes({ success: false, state: "unauthorized", user_message: "Non autorisé" }, 401);
    }
    const userId = userData.user.id;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonRes(
        {
          success: false,
          state: "unknown",
          user_message: "Données invalides.",
          details: parsed.error.flatten().fieldErrors,
        },
        400,
      );
    }
    const { identifier, tx_reference, order_id } = parsed.data;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve target orders by tx_reference / identifier OR by explicit order_id.
    // We always cross-check ownership: order.buyer_id → profile.user_id == auth user.
    let orders: any[] = [];
    if (order_id) {
      const { data } = await admin
        .from("orders")
        .select("id, buyer_id, status, total_price, notes, product_id")
        .eq("id", order_id);
      orders = data || [];
    } else {
      const ref = identifier || tx_reference!;
      const { data } = await admin
        .from("orders")
        .select("id, buyer_id, status, total_price, notes, product_id")
        .ilike("notes", `%${ref}%`)
        .limit(20);
      orders = data || [];
    }

    if (!orders.length) {
      // Nothing to reconcile on the order side — still fall back to Paygate query so we
      // can return a meaningful state to the caller (formation use case)
    } else {
      // Ownership check
      const buyerProfileIds = Array.from(new Set(orders.map((o) => o.buyer_id)));
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, user_id")
        .in("id", buyerProfileIds);
      const ownedProfileIds = new Set((profiles || []).filter((p) => p.user_id === userId).map((p) => p.id));
      orders = orders.filter((o) => ownedProfileIds.has(o.buyer_id));
      if (!orders.length) {
        return jsonRes(
          { success: false, state: "unauthorized", user_message: "Cette commande ne vous appartient pas." },
          403,
        );
      }
    }

    // Query Paygate
    const params = new URLSearchParams();
    params.append("auth_token", PAYGATE_API_KEY);
    if (tx_reference) params.append("tx_reference", tx_reference);
    else if (identifier) params.append("identifier", identifier);
    else if (orders.length) {
      // Try to extract tx_ref from notes
      const notes = (orders[0].notes || "") as string;
      const refFromNotes = notes
        .split("|")
        .map((s) => s.trim())
        .find((p) => p.startsWith("tx_ref:"))
        ?.replace("tx_ref:", "")
        .trim();
      if (refFromNotes) params.append("identifier", refFromNotes);
    }

    let payRaw: any = {};
    let mapped: ReturnType<typeof mapPaygateRaw> = {
      state: "unknown",
      rawCode: "",
    };
    try {
      const payResp = await fetch("https://paygateglobal.com/api/v1/status", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      payRaw = await payResp.json().catch(() => ({}));
      mapped = mapPaygateRaw(payRaw);
    } catch (e) {
      console.error("[reconcile-order] Paygate fetch failed", e);
      mapped = { state: "unknown", rawCode: "fetch_error" };
    }

    // Compute the expected total across the orders bundle
    const expectedTotal = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const reportedAmount = mapped.amount ?? null;

    // ----- DECISION TREE -----
    // 1) Paygate says success → finalize any still-pending order and return success
    //    If reported amount differs from expected, surface as `debited_pending_finalization`
    //    with an explicit mismatch message (operator review needed).
    if (mapped.state === "success" && orders.length) {
      const pendingOrders = orders.filter((o) => o.status === "pending");
      const amountMatches =
        reportedAmount == null || reportedAmount === expectedTotal;

      if (amountMatches) {
        for (const o of pendingOrders) {
          await admin
            .from("orders")
            .update({
              status: "confirmed",
              notes: `${o.notes || ""} | Réconcilié via reconcile-order @ ${new Date().toISOString()}`,
            })
            .eq("id", o.id)
            .eq("status", "pending");
        }
        return jsonRes({
          success: true,
          state: "success" satisfies ReconcileState,
          user_message:
            pendingOrders.length > 0
              ? "Le débit est confirmé et votre commande a été finalisée."
              : "Le débit et la commande sont confirmés.",
          paygate_status: mapped.rawCode,
          amount: reportedAmount ?? expectedTotal,
          payment_method: mapped.paymentMethod,
          payment_reference: mapped.paymentReference,
          order_ids: orders.map((o) => o.id),
          finalized_count: pendingOrders.length,
        });
      }

      // Mismatch: charged amount != expected total → DO NOT auto-confirm, escalate.
      return jsonRes({
        success: false,
        state: "debited_pending_finalization" satisfies ReconcileState,
        user_message:
          "Paygate confirme un débit, mais le montant ne correspond pas à votre commande. Aucun nouveau prélèvement ne sera effectué — contactez le support pour régularisation.",
        paygate_status: mapped.rawCode,
        amount: reportedAmount,
        expected_amount: expectedTotal,
        payment_method: mapped.paymentMethod,
        payment_reference: mapped.paymentReference,
        order_ids: orders.map((o) => o.id),
      });
    }

    // 2) Paygate says success but we have NO matching order (e.g. formation) → just relay
    if (mapped.state === "success") {
      return jsonRes({
        success: true,
        state: "success",
        user_message: "Paiement confirmé chez Paygate.",
        paygate_status: mapped.rawCode,
        amount: reportedAmount,
        payment_method: mapped.paymentMethod,
        payment_reference: mapped.paymentReference,
      });
    }

    // 3) Paygate pending / expired / failed → relay status, never debit twice
    if (mapped.state === "pending") {
      return jsonRes({
        success: false,
        state: "pending",
        user_message:
          "Paiement encore en attente chez Paygate. Confirmez la transaction sur votre téléphone ou patientez.",
        paygate_status: mapped.rawCode,
      });
    }
    if (mapped.state === "expired") {
      return jsonRes({
        success: false,
        state: "expired",
        user_message: "La session Paygate a expiré. Aucun montant n'a été débité — relancez le paiement.",
        paygate_status: mapped.rawCode,
      });
    }
    if (mapped.state === "failed") {
      return jsonRes({
        success: false,
        state: "failed",
        user_message: "Paygate signale un paiement échoué/annulé. Aucun montant n'a été débité.",
        paygate_status: mapped.rawCode,
      });
    }

    // 4) Truly unknown — return unknown so the UI can keep polling / let user escalate
    return jsonRes({
      success: false,
      state: "unknown" satisfies ReconcileState,
      user_message:
        "Statut de paiement non confirmé. Si le montant a été débité, le service va se synchroniser sous peu. Vous pouvez recontrôler ou contacter le support.",
      paygate_status: mapped.rawCode || "unavailable",
    });
  } catch (e) {
    console.error("[reconcile-order] error", e);
    return jsonRes(
      { success: false, state: "unknown", user_message: "Erreur serveur. Veuillez réessayer." },
      500,
    );
  }
});

function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
