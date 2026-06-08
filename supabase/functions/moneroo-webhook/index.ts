import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-moneroo-signature",
};

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sign(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const normalizeStatus = (value: unknown) => {
  const s = String(value || "").toLowerCase();
  if (["success", "completed", "paid", "successful", "succeeded"].includes(s)) return "success";
  if (["failed", "cancelled", "expired", "pending", "initiated"].includes(s)) return s;
  return "pending";
};

const getOrderIds = (data: Record<string, unknown>): string[] => {
  if (Array.isArray(data.orderIds)) return data.orderIds.map(String).filter(Boolean);
  if (typeof data.orderIdsCsv === "string") return data.orderIdsCsv.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
};

async function finalizeCart(admin: any, tx: any, paymentId: string) {
  const data = tx.context_data || {};
  const orderIds = getOrderIds(data);
  if (!orderIds.length) return;
  const { data: orders } = await admin.from("orders").select("id, seller_id, total_price, notes").in("id", orderIds);
  const sellerIds = [...new Set((orders || []).map((o: any) => o.seller_id).filter(Boolean))];
  const { data: sellers } = sellerIds.length ? await admin.from("profiles").select("id, user_id").in("id", sellerIds) : { data: [] };
  const sellerMap = new Map((sellers || []).map((s: any) => [s.id, s]));
  const deliveryMethod = String(data.deliveryMethod || "pickup");
  const deliveryPrice = Number(data.deliveryPrice || 0);
  const perOrderDelivery = orders?.length ? Math.round(deliveryPrice / orders.length) : 0;
  const driverFee = Math.round(perOrderDelivery * 0.8);
  const platformFee = perOrderDelivery - driverFee;
  const dropoff = [data.deliveryCity, data.deliveryAddress].filter(Boolean).join(", ");

  for (const order of orders || []) {
    await admin.from("orders").update({ status: "confirmed", notes: `${order.notes || ""} | Paiement Moneroo confirmé webhook: ${paymentId}` }).eq("id", order.id).in("status", ["pending", "confirmed"]);
    const seller = sellerMap.get(order.seller_id);
    if (seller?.user_id) {
      const { error: walletErr } = await admin.from("wallet_movements").insert({
        user_id: seller.user_id,
        order_id: order.id,
        type: "credit",
        amount: Number(order.total_price || 0),
        description: `Vente confirmée Moneroo — commande ${order.id}`,
      });
      if (walletErr && walletErr.code !== "23505") throw walletErr;
    }
    if (deliveryMethod === "livreur") {
      const { data: delivery } = await admin.from("deliveries").upsert({
        order_id: order.id,
        driver_id: data.selectedDriverId ? String(data.selectedDriverId) : null,
        dropoff_address: dropoff,
        delivery_fee: perOrderDelivery,
        driver_fee: driverFee,
        platform_fee: platformFee,
        distance_km: data.distanceKm == null ? null : Number(data.distanceKm),
        estimated_minutes: data.distanceKm == null ? null : Math.round(Number(data.distanceKm) * 3),
        status: data.selectedDriverId ? "accepted" : "pending",
        accepted_at: data.selectedDriverId ? new Date().toISOString() : null,
      }, { onConflict: "order_id" }).select("id").single();
      if (delivery?.id) {
        await admin.from("delivery_messages").insert({
          delivery_id: delivery.id,
          sender_id: tx.user_id,
          sender_role: "buyer",
          content: `Commande payée. Adresse: ${dropoff || "à confirmer"}. Référence paiement: ${paymentId}`,
        });
      }
    }
  }
  await admin.from("notifications").insert({ user_id: tx.user_id, type: "order", title: "✅ Paiement confirmé", description: "Commande finalisée, vendeur crédité et livraison activée." });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const raw = await req.text();
    const secret = Deno.env.get("MONEROO_WEBHOOK_SECRET") || Deno.env.get("MONEROO_SECRET_KEY") || "";
    const signature = req.headers.get("X-Moneroo-Signature") || req.headers.get("x-moneroo-signature") || "";
    if (!secret || !safeEqual(signature, await sign(secret, raw))) {
      return new Response(JSON.stringify({ error: "Signature invalide" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = JSON.parse(raw || "{}");
    const provider = payload?.data || payload;
    const paymentId = provider?.id || provider?.payment_id;
    if (!paymentId) return new Response(JSON.stringify({ received: true, ignored: "missing_payment_id" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin.from("moneroo_transactions").select("*").eq("payment_id", paymentId).maybeSingle();
    const status = normalizeStatus(provider?.status || payload?.event?.replace("payment.", ""));
    const txPayload = {
      status,
      provider_response: provider,
      verified_at: new Date().toISOString(),
      completed_at: status === "success" ? new Date().toISOString() : existing?.completed_at,
      failure_reason: ["failed", "cancelled", "expired"].includes(status) ? status : null,
    };
    const { data: tx } = await admin.from("moneroo_transactions").update(txPayload).eq("payment_id", paymentId).select("*").maybeSingle();
    const finalTx = tx || existing;
    if (status === "success" && finalTx?.context === "cart") await finalizeCart(admin, finalTx, paymentId);

    return new Response(JSON.stringify({ received: true, status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("moneroo-webhook error", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});