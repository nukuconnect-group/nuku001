import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  formation_id: z.string().uuid(),
  identifier: z.string().min(1).max(255),
  tx_reference: z.string().optional(),
});

// Map Paygate status code to a normalized state + user/admin friendly messages.
// Paygate /api/v1/status returns:
//   0 = paid  /  2 = pending  /  4 = expired  /  6 = cancelled  /  -1 = invalid
// Paygate webhook tx_status: T = success, F = failed, X = expired
function mapPaygateStatus(payData: any): {
  state: "success" | "pending" | "failed" | "expired" | "unknown";
  userMessage: string;
  adminMessage: string;
} {
  const raw = payData?.status ?? payData?.tx_status ?? null;
  const code = String(raw ?? "").trim();

  if (code === "0" || code === "T" || code === "success") {
    return {
      state: "success",
      userMessage: "Paiement confirmé. Inscription en cours…",
      adminMessage: `Paygate OK (status=${code}) — inscription déclenchée.`,
    };
  }
  if (code === "2" || code === "pending") {
    return {
      state: "pending",
      userMessage: "Paiement en attente de validation. Confirmez la transaction sur votre téléphone ou patientez quelques instants.",
      adminMessage: `Paygate pending (status=${code}). Aucune action effectuée.`,
    };
  }
  if (code === "4" || code === "X" || code === "expired") {
    return {
      state: "expired",
      userMessage: "La session de paiement a expiré. Relancez le paiement pour réessayer.",
      adminMessage: `Paygate expired (status=${code}).`,
    };
  }
  if (code === "6" || code === "F" || code === "failed" || code === "cancelled") {
    return {
      state: "failed",
      userMessage: "Le paiement a échoué ou a été annulé. Aucun montant n'a été débité.",
      adminMessage: `Paygate failed/cancelled (status=${code}).`,
    };
  }
  return {
    state: "unknown",
    userMessage: "Statut de paiement inconnu. Si le montant a été débité, le service va se synchroniser sous peu.",
    adminMessage: `Paygate unknown (status=${code}). Raw: ${JSON.stringify(payData).slice(0, 300)}`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, state: "unauthorized", error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYGATE_API_KEY = Deno.env.get("PAYGATE_API_KEY") || "";

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ success: false, state: "unauthorized", error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({
        success: false, state: "invalid_input",
        error: "Données invalides", details: parsed.error.flatten().fieldErrors,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { formation_id, identifier, tx_reference } = parsed.data;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the formation exists and is paid
    const { data: formation, error: fErr } = await admin
      .from("formations")
      .select("id, is_paid, price, title")
      .eq("id", formation_id)
      .single();
    if (fErr || !formation) {
      return new Response(JSON.stringify({ success: false, state: "not_found", error: "Formation introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!formation.is_paid) {
      return new Response(JSON.stringify({
        success: false, state: "not_paid_formation",
        error: "Cette formation est gratuite, inscription directe possible.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------------------------------------------------------------------
    // STRONG IDEMPOTENCY (works for webhook AND polling, even concurrent)
    // ---------------------------------------------------------------------
    // 1. If the user is already enrolled → success no-op
    const { data: existingEnrollment } = await admin
      .from("formation_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("formation_id", formation_id)
      .is("module_id", null)
      .maybeSingle();
    if (existingEnrollment) {
      // Make sure the payment row is also recorded as success for traceability
      await admin.from("formation_payments").upsert({
        user_id: userId,
        formation_id,
        identifier,
        tx_reference: tx_reference ?? null,
        status: "success",
        paygate_status: "already_enrolled",
        amount: formation.price,
      }, { onConflict: "identifier" });
      return new Response(JSON.stringify({
        success: true, state: "already_enrolled",
        user_message: "Vous êtes déjà inscrit à cette formation.",
        admin_message: "Idempotency hit: enrollment already exists.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. If a payment row already marked as success exists for this tx_reference or identifier
    //    → trust it and just create the enrollment (handles webhook-then-polling races)
    let knownSuccess = false;
    {
      const filters: string[] = [`identifier.eq.${identifier}`];
      if (tx_reference) filters.push(`tx_reference.eq.${tx_reference}`);
      const { data: priorPayments } = await admin
        .from("formation_payments")
        .select("id, status, user_id, formation_id")
        .or(filters.join(","))
        .limit(5);
      const successRow = (priorPayments || []).find((p: any) =>
        p.status === "success" && p.user_id === userId && p.formation_id === formation_id
      );
      if (successRow) knownSuccess = true;
    }

    // 3. Verify payment via Paygate (skip if we already know it succeeded)
    let mapped: ReturnType<typeof mapPaygateStatus> = {
      state: "success",
      userMessage: "Paiement déjà confirmé.",
      adminMessage: "Skipped Paygate call: payment already recorded as success.",
    };
    let payData: any = { cached: true };

    if (!knownSuccess) {
      const params = new URLSearchParams();
      params.append("auth_token", PAYGATE_API_KEY);
      if (tx_reference) params.append("tx_reference", tx_reference);
      else params.append("identifier", identifier);

      const payResp = await fetch("https://paygateglobal.com/api/v1/status", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      payData = await payResp.json().catch(() => ({}));
      mapped = mapPaygateStatus(payData);
    }

    // 4. Persist the payment attempt with strong dedup on (tx_reference) and (identifier)
    //    Unique indexes guarantee no double row even on concurrent webhook+polling.
    await admin.from("formation_payments").upsert({
      user_id: userId,
      formation_id,
      identifier,
      tx_reference: tx_reference ?? null,
      paygate_status: String(payData?.status ?? payData?.tx_status ?? "unknown"),
      amount: formation.price,
      status: mapped.state === "success" ? "success" : mapped.state === "pending" ? "pending" : mapped.state,
      raw_response: payData,
    }, { onConflict: "identifier" });

    if (mapped.state !== "success") {
      const httpStatus =
        mapped.state === "pending" ? 202 :
        mapped.state === "expired" ? 410 :
        mapped.state === "failed" ? 402 : 409;
      return new Response(JSON.stringify({
        success: false,
        state: mapped.state,
        user_message: mapped.userMessage,
        admin_message: mapped.adminMessage,
        paygate_status: payData?.status ?? payData?.tx_status,
      }), { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Enrollment — guard with another existence check (anti race) and ON CONFLICT DO NOTHING
    const { data: raceCheck } = await admin
      .from("formation_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("formation_id", formation_id)
      .is("module_id", null)
      .maybeSingle();
    if (raceCheck) {
      return new Response(JSON.stringify({
        success: true, state: "already_enrolled",
        user_message: "Inscription déjà confirmée.",
        admin_message: "Race detected post-Paygate: enrollment already exists.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: insErr } = await admin.from("formation_progress").insert({
      user_id: userId,
      formation_id,
      module_id: null,
      completed: false,
      progress_percent: 0,
    });
    if (insErr) {
      // Unique violation → treat as success (idempotent)
      if (String(insErr.message || "").toLowerCase().includes("duplicate") ||
          String((insErr as any).code || "") === "23505") {
        return new Response(JSON.stringify({
          success: true, state: "already_enrolled",
          user_message: "Inscription déjà confirmée.",
          admin_message: "Insert duplicate detected — treated as idempotent success.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        success: false, state: "db_error",
        user_message: "Inscription impossible pour le moment, veuillez réessayer.",
        admin_message: insErr.message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Notification (best-effort)
    await admin.from("notifications").insert({
      user_id: userId,
      type: "formation",
      title: "Inscription confirmée ✅",
      description: `Vous avez accès à la formation : ${formation.title}`,
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      state: "enrolled",
      user_message: "Paiement confirmé et inscription validée. Bonne formation !",
      admin_message: mapped.adminMessage,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[enroll-paid-formation] error", e);
    return new Response(JSON.stringify({
      success: false, state: "server_error",
      user_message: "Erreur serveur. Veuillez réessayer dans un instant.",
      admin_message: (e as Error).message,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
