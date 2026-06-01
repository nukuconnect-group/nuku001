import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WebhookSchema = z.object({
  tx_reference: z.string().min(1),
  status: z.union([z.string(), z.number()]),
  identifier: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  payment_reference: z.string().optional(),
  payment_method: z.string().optional(),
  datetime: z.string().optional(),
});

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Shared-secret authentication: Paygate must include ?token=… or X-Paygate-Token header
  // matching the PAYGATE_WEBHOOK_SECRET stored in Edge Function secrets.
  const expectedSecret = Deno.env.get("PAYGATE_WEBHOOK_SECRET") || "";
  const incomingToken =
    new URL(req.url).searchParams.get("token") ||
    req.headers.get("x-paygate-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!expectedSecret || !incomingToken || !safeEqual(incomingToken, expectedSecret)) {
    console.warn("[paygate-webhook] Rejected: missing or invalid shared secret");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let rawData: Record<string, unknown>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      rawData = Object.fromEntries(formData.entries());
    } else {
      rawData = await req.json();
    }

    console.log("[paygate-webhook] Received:", JSON.stringify(rawData));

    const parsed = WebhookSchema.safeParse(rawData);
    if (!parsed.success) {
      console.error("[paygate-webhook] Invalid payload:", parsed.error.flatten());
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tx_reference, status, identifier, amount, payment_reference } = parsed.data;

    const rawStatus = typeof status === "number" ? status : parseInt(String(status), 10);
    let paymentStatus = "unknown";
    if (rawStatus === 0) paymentStatus = "completed";
    else if (rawStatus === 2) paymentStatus = "pending";
    else if (rawStatus === 4) paymentStatus = "expired";
    else if (rawStatus === 6) paymentStatus = "failed";

    console.log(`[paygate-webhook] tx_reference=${tx_reference}, status=${paymentStatus} (raw=${rawStatus})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Use tx_reference or identifier as idempotency key
    const idempotencyKeyRaw = tx_reference || identifier || "";
    // Escape SQL LIKE wildcards (% and _) to prevent matching multiple unrelated orders
    const idempotencyKey = idempotencyKeyRaw.replace(/[\\%_]/g, (c) => `\\${c}`);

    if (paymentStatus === "completed" && idempotencyKey) {
      // Find pending orders matching this transaction — idempotent: only update status=pending
      const { data: orders, error: queryError } = await supabase
        .from("orders")
        .select("id, status, buyer_id, notes")
        .or(`notes.ilike.%${idempotencyKey}%`)
        .eq("status", "pending");

      if (queryError) {
        console.error("[paygate-webhook] Query error:", queryError.message);
      } else if (orders && orders.length > 0) {
        for (const order of orders) {
          // Atomic update: only pending → confirmed (idempotent — second call does nothing)
          const { data: updated, error: updateError } = await supabase
            .from("orders")
            .update({
              status: "confirmed",
              notes: `${order.notes || ""} | Paiement confirmé webhook: ${payment_reference || tx_reference} | ref: ${idempotencyKey}`,
            })
            .eq("id", order.id)
            .eq("status", "pending") // idempotency guard
            .select("id")
            .maybeSingle();

          if (updateError) {
            console.error(`[paygate-webhook] Update error order ${order.id}:`, updateError.message);
          } else if (updated) {
            console.log(`[paygate-webhook] Order ${order.id} confirmed (idempotent)`);

            await supabase.from("notifications").insert({
              user_id: order.buyer_id,
              type: "order",
              title: "✅ Paiement confirmé",
              description: `Votre paiement de ${amount || "N/A"} FCFA a été confirmé avec succès.`,
            });
          } else {
            console.log(`[paygate-webhook] Order ${order.id} already confirmed — skipped (idempotent)`);
          }
        }
      } else {
        console.log("[paygate-webhook] No pending orders for idempotencyKey:", idempotencyKey);
      }
    } else if (paymentStatus === "failed" || paymentStatus === "expired") {
      // Cancel pending orders for failed/expired payments
      const { data: orders } = await supabase
        .from("orders")
        .select("id, buyer_id, notes")
        .or(`notes.ilike.%${idempotencyKey}%`)
        .eq("status", "pending");

      if (orders && orders.length > 0) {
        for (const order of orders) {
          await supabase
            .from("orders")
            .update({
              status: "cancelled",
              notes: `${order.notes || ""} | Paiement ${paymentStatus} webhook: ${tx_reference}`,
            })
            .eq("id", order.id)
            .eq("status", "pending");

          await supabase.from("notifications").insert({
            user_id: order.buyer_id,
            type: "order",
            title: paymentStatus === "failed" ? "❌ Paiement échoué" : "⏰ Paiement expiré",
            description: `Votre paiement n'a pas abouti. La commande a été annulée.`,
          });
        }
        console.log(`[paygate-webhook] ${orders.length} orders cancelled (${paymentStatus})`);
      }
    }

    return new Response(JSON.stringify({ received: true, status: paymentStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[paygate-webhook] Error:", msg);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
