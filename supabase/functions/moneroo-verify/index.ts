import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

async function finalizeCartPayment(admin: any, tx: any, paymentId: string) {
  const data = tx.context_data || {};
  const orderIds = getOrderIds(data);
  if (!orderIds.length) return;

  const { data: orders, error: orderErr } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, product_id, total_price, status, notes")
    .in("id", orderIds);
  if (orderErr) throw orderErr;

  const sellerProfileIds = [...new Set((orders || []).map((o: any) => o.seller_id).filter(Boolean))];
  const { data: sellers } = sellerProfileIds.length
    ? await admin.from("profiles").select("id, user_id, full_name").in("id", sellerProfileIds)
    : { data: [] };
  const sellerMap = new Map((sellers || []).map((s: any) => [s.id, s]));

  const deliveryMethod = String(data.deliveryMethod || "pickup");
  const deliveryPrice = Number(data.deliveryPrice || 0);
  const perOrderDelivery = orders?.length ? Math.round(deliveryPrice / orders.length) : 0;
  const driverFee = Math.round(perOrderDelivery * 0.8);
  const platformFee = perOrderDelivery - driverFee;
  const selectedDriverId = data.selectedDriverId ? String(data.selectedDriverId) : null;
  const deliveryAddress = [data.deliveryCity, data.deliveryAddress].filter(Boolean).join(", ");
  const buyerName = String(data.buyerFullName || "Client");

  for (const order of orders || []) {
    const previousNotes = order.notes || "";
    await admin
      .from("orders")
      .update({
        status: "confirmed",
        notes: `${previousNotes} | Paiement Moneroo confirmé: ${paymentId}`,
      })
      .eq("id", order.id)
      .in("status", ["pending", "confirmed"]);

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

      await admin.from("notifications").insert({
        user_id: seller.user_id,
        type: "order",
        title: "💰 Vente créditée",
        description: `Votre vente de ${Number(order.total_price || 0).toLocaleString("fr-FR")} FCFA est créditée sur votre compte vendeur.`,
      });
    }

    if (deliveryMethod === "livreur") {
      const { data: delivery } = await admin.from("deliveries").upsert({
        order_id: order.id,
        driver_id: selectedDriverId,
        dropoff_address: deliveryAddress,
        delivery_fee: perOrderDelivery,
        driver_fee: driverFee,
        platform_fee: platformFee,
        distance_km: data.distanceKm == null ? null : Number(data.distanceKm),
        estimated_minutes: data.distanceKm == null ? null : Math.round(Number(data.distanceKm) * 3),
        status: selectedDriverId ? "accepted" : "pending",
        accepted_at: selectedDriverId ? new Date().toISOString() : null,
      }, { onConflict: "order_id" }).select("id").single();

      if (delivery?.id) {
        await admin.from("delivery_messages").insert({
          delivery_id: delivery.id,
          sender_id: tx.user_id,
          sender_role: "buyer",
          content: `Commande payée par ${buyerName}. Adresse: ${deliveryAddress || "à confirmer"}. Référence paiement: ${paymentId}`,
        });
      }
    }
  }

  await admin.from("notifications").insert({
    user_id: tx.user_id,
    type: "order",
    title: "✅ Commande confirmée !",
    description: "Paiement confirmé, vendeur crédité et suivi de livraison activé.",
  });
}

async function finalizePayment(admin: any, tx: any, paymentId: string) {
  const context = tx.context;
  const data = tx.context_data || {};
  const userId = tx.user_id;

  if (context === "cart") {
    await finalizeCartPayment(admin, tx, paymentId);
  }

  if (context === "plan") {
    const plan = String(data.planId || "standard");
    const maxProducts: Record<string, number> = { free: 5, starter: 15, standard: 30, premium: 9999, enterprise: 9999 };
    await admin.from("subscriptions").upsert({ user_id: userId, plan, billing_period: "annual", max_products: maxProducts[plan] || 30, status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 365 * 86400000).toISOString() }, { onConflict: "user_id" });
    await admin.from("notifications").insert({ user_id: userId, type: "subscription", title: `🎉 Plan ${data.planName || plan} activé !`, description: "Votre abonnement Moneroo est confirmé." });
  }

  if (context === "tokens") {
    const packCode = String(data.packCode || "");
    const { data: pack } = await admin.from("token_packs").select("id, code, tokens, bonus_tokens, price_fcfa").eq("code", packCode).eq("is_active", true).maybeSingle();
    if (pack) {
      const amount = Number(pack.tokens || 0) + Number(pack.bonus_tokens || 0);
      const { data: existing } = await admin.from("token_purchases").select("id").eq("payment_identifier", paymentId).maybeSingle();
      if (!existing) {
        const { data: purchase } = await admin.from("token_purchases").insert({ user_id: userId, pack_id: pack.id, pack_code: pack.code, tokens_purchased: amount, tokens_remaining: amount, price_fcfa: pack.price_fcfa, payment_status: "completed", payment_reference: paymentId, payment_identifier: paymentId, completed_at: new Date().toISOString() }).select("id").single();
        const { data: bal } = await admin.rpc("get_user_token_balance", { p_user_id: userId });
        await admin.from("token_transactions").insert({ user_id: userId, purchase_id: purchase?.id, type: "purchase", amount, balance_after: bal || amount, reason: `Achat ${pack.code}`, reference_type: "token_pack" });
      }
      await admin.from("notifications").insert({ user_id: userId, type: "tokens", title: `🎁 ${amount} jetons crédités`, description: "Votre recharge Moneroo est confirmée." });
    }
  }

  if (context === "formation" && data.formationId) {
    await admin.from("formation_progress").upsert({ user_id: userId, formation_id: data.formationId, progress_percent: 0, completed: false }, { onConflict: "user_id,formation_id,module_id" });
    await admin.from("formation_payments").upsert({ user_id: userId, formation_id: data.formationId, identifier: paymentId, tx_reference: paymentId, status: "success", paygate_status: "moneroo_success", amount: tx.amount, raw_response: tx.provider_response }, { onConflict: "identifier" });
    await admin.from("notifications").insert({ user_id: userId, type: "formation", title: "✅ Formation débloquée", description: "Votre paiement Moneroo est confirmé." });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const secret = Deno.env.get("MONEROO_SECRET_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Session invalide" }, 401);

    const { payment_id, context, context_data } = await req.json();
    if (!payment_id) return json({ error: "Identifiant Moneroo manquant" }, 400);

    const admin = createClient(url, service);
    const { data: existing } = await admin.from("moneroo_transactions").select("*").eq("payment_id", payment_id).maybeSingle();
    if (existing && existing.user_id !== user.id) return json({ error: "Paiement non autorisé" }, 403);

    const res = await fetch(`https://api.moneroo.io/v1/payments/${encodeURIComponent(payment_id)}/verify`, { headers: { Accept: "application/json", Authorization: `Bearer ${secret}` } });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: raw?.message || "Vérification Moneroo impossible", raw }, 502);

    const provider = raw?.data || raw;
    const status = normalizeStatus(provider?.status);
    const mergedContext = existing?.context || context || provider?.metadata?.context || "direct";
    const mergedData = existing?.context_data || context_data || provider?.metadata || {};
    const amount = Number(provider?.amount ?? existing?.amount ?? 0);

    const { data: tx, error } = await admin.from("moneroo_transactions").upsert({
      user_id: user.id,
      payment_id,
      status,
      amount,
      currency: provider?.currency || existing?.currency || "XOF",
      context: mergedContext,
      context_data: mergedData,
      checkout_url: provider?.checkout_url || existing?.checkout_url,
      description: provider?.description || existing?.description,
      customer_email: provider?.customer?.email || existing?.customer_email || user.email,
      provider_response: provider,
      verified_at: new Date().toISOString(),
      completed_at: status === "success" ? new Date().toISOString() : existing?.completed_at,
      failure_reason: ["failed", "cancelled", "expired"].includes(status) ? (provider?.capture?.failure_message || status) : null,
    }, { onConflict: "payment_id" }).select("*").single();
    if (error) return json({ error: error.message }, 500);

    if (status === "success") await finalizePayment(admin, tx, payment_id);
    return json({ success: status === "success", status, transaction: tx });
  } catch (e) {
    console.error("moneroo-verify", e);
    return json({ error: (e as Error).message || "Erreur serveur" }, 500);
  }
});
