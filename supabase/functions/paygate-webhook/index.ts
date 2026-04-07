import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Paygate webhook callback schema
const WebhookSchema = z.object({
  tx_reference: z.string().min(1),
  status: z.union([z.string(), z.number()]),
  identifier: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  payment_reference: z.string().optional(),
  payment_method: z.string().optional(),
  datetime: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse webhook payload (could be form-encoded or JSON)
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

    // Convert Paygate status code
    const rawStatus = typeof status === "number" ? status : parseInt(String(status), 10);
    let paymentStatus = "unknown";
    if (rawStatus === 0) paymentStatus = "completed";
    else if (rawStatus === 2) paymentStatus = "pending";
    else if (rawStatus === 4) paymentStatus = "expired";
    else if (rawStatus === 6) paymentStatus = "failed";

    console.log(`[paygate-webhook] tx_reference=${tx_reference}, status=${paymentStatus} (raw=${rawStatus})`);

    // If payment is completed, update the order status
    if (paymentStatus === "completed" && tx_reference) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Find orders with this tx_reference in notes
      const { data: orders, error: queryError } = await supabase
        .from("orders")
        .select("id, status, buyer_id, notes")
        .or(`notes.ilike.%${tx_reference}%`)
        .eq("status", "pending");

      if (queryError) {
        console.error("[paygate-webhook] Query error:", queryError.message);
      } else if (orders && orders.length > 0) {
        for (const order of orders) {
          // Update order status to confirmed
          const { error: updateError } = await supabase
            .from("orders")
            .update({ 
              status: "confirmed",
              notes: `${order.notes || ""} | Paiement confirmé via webhook: ${payment_reference || tx_reference}`
            })
            .eq("id", order.id);

          if (updateError) {
            console.error(`[paygate-webhook] Failed to update order ${order.id}:`, updateError.message);
          } else {
            console.log(`[paygate-webhook] Order ${order.id} confirmed via webhook`);

            // Notify the buyer
            await supabase.from("notifications").insert({
              user_id: order.buyer_id,
              type: "order",
              title: "✅ Paiement confirmé",
              description: `Votre paiement de ${amount || "N/A"} FCFA a été confirmé avec succès.`,
            });
          }
        }
      } else {
        console.log("[paygate-webhook] No pending orders found for tx_reference:", tx_reference);
      }
    }

    // Always respond 200 to acknowledge receipt
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
