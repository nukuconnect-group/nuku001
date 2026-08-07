/**
 * Post-payment business logic shared by solimi-verify (polling) and
 * solimi-webhook (push). Safe to run more than once: every write is guarded
 * so a webhook + a manual verification never double-credit anything.
 */

const getOrderIds = (data: Record<string, unknown>): string[] => {
  if (Array.isArray(data.orderIds)) return data.orderIds.map(String).filter(Boolean);
  if (typeof data.orderIdsCsv === "string") return data.orderIdsCsv.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
};

async function sendCartPurchaseEmails(admin: any, tx: any, orders: any[], data: any, paymentId: string) {
  try {
    const { data: buyerAuth } = await admin.auth.admin.getUserById(tx.user_id);
    const buyerEmail = buyerAuth?.user?.email || tx.customer_email;
    if (!buyerEmail) {
      console.warn("[email] no buyer email for tx", paymentId);
      return;
    }

    const { data: buyerProfile } = await admin
      .from("profiles")
      .select("id, full_name, phone")
      .eq("user_id", tx.user_id)
      .maybeSingle();

    const orderIds = (orders || []).map((o: any) => o.id).filter(Boolean);
    if (!orderIds.length) return;

    const { data: items } = await admin
      .from("orders")
      .select(
        "id, seller_id, quantity, unit_price, total_price, products(name, unit), profiles!orders_seller_id_fkey(id, full_name, business_name, user_id)",
      )
      .in("id", orderIds);

    const allItems = (items || []).map((o: any) => ({
      orderId: o.id,
      sellerProfileId: o.profiles?.id || o.seller_id,
      sellerUserId: o.profiles?.user_id || null,
      sellerName: o.profiles?.business_name || o.profiles?.full_name || "Boutique NukuConnect",
      name: o.products?.name || "Produit NukuConnect",
      quantity: Number(o.quantity || 1),
      unitPrice: Number(o.unit_price || 0),
      unit: o.products?.unit || "unité",
      total: Number(o.total_price || 0),
    }));

    const subtotal = allItems.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0);
    const total = orders.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
    const deliveryPrice = Number(data.deliveryPrice || 0);
    const invoiceNumber = `INV-${paymentId.slice(0, 10).toUpperCase()}`;
    const orderDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const siteOrigin = Deno.env.get("PUBLIC_SITE_URL") || "https://nukuconnect.com";
    const invoiceUrl = `${siteOrigin}/factures?invoice=${encodeURIComponent(invoiceNumber)}`;
    const sellerActionUrl = `${siteOrigin}/tableau-de-bord?tab=orders&invoice=${encodeURIComponent(invoiceNumber)}`;
    const buyerName = buyerProfile?.full_name || String(data.buyerFullName || buyerEmail.split("@")[0]);
    const deliveryMethod = String(data.deliveryMethod || "pickup") === "livreur" ? "Livraison à domicile" : "Retrait sur place";

    const { error: buyerEmailErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "order-confirmation",
        recipientEmail: buyerEmail,
        idempotencyKey: `order-confirmation-${paymentId}-${tx.user_id}`,
        templateData: {
          buyerName,
          invoiceNumber,
          orderDate,
          orderItems: allItems.map(({ name, quantity, unitPrice, unit, sellerName }: any) => ({ name, quantity, unitPrice, unit, sellerName })),
          subtotal,
          deliveryPrice,
          total,
          deliveryMethod,
          paymentMethod: "SOLIMI",
          deliveryCity: data.deliveryCity || "",
          invoiceUrl,
        },
      },
    });
    if (buyerEmailErr) console.error("[email] buyer order-confirmation failed:", buyerEmailErr);

    const sellersMap = new Map<string, typeof allItems>();
    for (const item of allItems) {
      if (!item.sellerProfileId) continue;
      if (!sellersMap.has(item.sellerProfileId)) sellersMap.set(item.sellerProfileId, []);
      sellersMap.get(item.sellerProfileId)!.push(item);
    }

    for (const [sellerProfileId, sellerItems] of sellersMap.entries()) {
      const sellerUserId = sellerItems[0].sellerUserId;
      if (!sellerUserId) continue;
      const { data: sellerAuth } = await admin.auth.admin.getUserById(sellerUserId);
      const sellerEmail = sellerAuth?.user?.email;
      if (!sellerEmail) {
        console.warn("[email] no seller email", sellerProfileId);
        continue;
      }
      const sellerTotal = sellerItems.reduce((s: number, i: any) => s + i.total, 0);
      const { error: sellerEmailErr } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "new-order-seller",
          recipientEmail: sellerEmail,
          idempotencyKey: `new-order-seller-${paymentId}-${sellerProfileId}`,
          templateData: {
            sellerName: sellerItems[0].sellerName,
            buyerName,
            invoiceNumber,
            orderDate,
            orderItems: sellerItems.map(({ name, quantity, unitPrice, unit }: any) => ({ name, quantity, unitPrice, unit })),
            total: sellerTotal,
            deliveryMethod,
            deliveryCity: data.deliveryCity || "",
            buyerPhone: buyerProfile?.phone || "",
            invoiceUrl,
            sellerActionUrl,
          },
        },
      });
      if (sellerEmailErr) console.error("[email] seller new-order failed:", sellerEmailErr);
    }
  } catch (error) {
    console.error("[email] sendCartPurchaseEmails error:", error);
  }
}

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
    if (!previousNotes.includes(paymentId)) {
      await admin
        .from("orders")
        .update({ status: "confirmed", notes: `${previousNotes} | Paiement SOLIMI confirmé: ${paymentId}` })
        .eq("id", order.id)
        .in("status", ["pending", "confirmed"]);
    }

    const seller = sellerMap.get(order.seller_id);
    if (seller?.user_id) {
      const { data: existingMovement } = await admin
        .from("wallet_movements")
        .select("id")
        .eq("order_id", order.id)
        .eq("type", "credit")
        .maybeSingle();

      if (!existingMovement) {
        const { error: walletErr } = await admin.from("wallet_movements").insert({
          user_id: seller.user_id,
          order_id: order.id,
          type: "credit",
          amount: Number(order.total_price || 0),
          description: `Vente confirmée SOLIMI — commande ${order.id}`,
        });
        if (walletErr && walletErr.code !== "23505") throw walletErr;

        await admin.from("notifications").insert({
          user_id: seller.user_id,
          type: "order",
          title: "💰 Vente créditée",
          description: `Votre vente de ${Number(order.total_price || 0).toLocaleString("fr-FR")} FCFA est créditée sur votre compte vendeur.`,
        });
      }
    }

    if (deliveryMethod === "livreur") {
      const { data: delivery } = await admin
        .from("deliveries")
        .upsert(
          {
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
          },
          { onConflict: "order_id" },
        )
        .select("id")
        .single();

      if (delivery?.id) {
        const { data: existingMessage } = await admin
          .from("delivery_messages")
          .select("id")
          .eq("delivery_id", delivery.id)
          .ilike("content", `%${paymentId}%`)
          .maybeSingle();
        if (!existingMessage) {
          await admin.from("delivery_messages").insert({
            delivery_id: delivery.id,
            sender_id: tx.user_id,
            sender_role: "buyer",
            content: `Commande payée par ${buyerName}. Adresse: ${deliveryAddress || "à confirmer"}. Référence paiement: ${paymentId}`,
          });
        }
      }
    }
  }

  await admin.from("notifications").insert({
    user_id: tx.user_id,
    type: "order",
    title: "✅ Commande confirmée !",
    description: "Paiement confirmé, vendeur crédité et suivi de livraison activé.",
  });

  await sendCartPurchaseEmails(admin, tx, orders || [], data, paymentId);
}

/** Apply the business effect of a successful payment for every payment context. */
export async function finalizePayment(admin: any, tx: any, paymentId: string) {
  const context = tx.context;
  const data = tx.context_data || {};
  const userId = tx.user_id;

  if (context === "cart") {
    await finalizeCartPayment(admin, tx, paymentId);
  }

  if (context === "plan") {
    const plan = String(data.planId || "standard");
    const billingPeriod = String(data.billingPeriod || "annual");
    const months = billingPeriod === "monthly" ? 1 : 12;
    const maxProducts: Record<string, number> = { free: 5, starter: 15, standard: 30, premium: 9999, enterprise: 9999 };
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan,
        billing_period: billingPeriod,
        max_products: maxProducts[plan] || 30,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + months * 30 * 86400000).toISOString(),
      },
      { onConflict: "user_id" },
    );
    await admin.from("notifications").insert({
      user_id: userId,
      type: "subscription",
      title: `🎉 Plan ${data.planName || plan} activé !`,
      description: "Votre abonnement est confirmé.",
    });
  }

  if (context === "tokens") {
    const packCode = String(data.packCode || "");
    const { data: pack } = await admin
      .from("token_packs")
      .select("id, code, tokens, bonus_tokens, price_fcfa")
      .eq("code", packCode)
      .eq("is_active", true)
      .maybeSingle();
    if (pack) {
      const amount = Number(pack.tokens || 0) + Number(pack.bonus_tokens || 0);
      const { data: existing } = await admin
        .from("token_purchases")
        .select("id")
        .eq("payment_identifier", paymentId)
        .maybeSingle();
      if (!existing) {
        const { data: purchase } = await admin
          .from("token_purchases")
          .insert({
            user_id: userId,
            pack_id: pack.id,
            pack_code: pack.code,
            tokens_purchased: amount,
            tokens_remaining: amount,
            price_fcfa: pack.price_fcfa,
            payment_status: "completed",
            payment_reference: paymentId,
            payment_identifier: paymentId,
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        const { data: bal } = await admin.rpc("get_user_token_balance", { p_user_id: userId });
        await admin.from("token_transactions").insert({
          user_id: userId,
          purchase_id: purchase?.id,
          type: "purchase",
          amount,
          balance_after: bal || amount,
          reason: `Achat ${pack.code}`,
          reference_type: "token_pack",
        });
        await admin.from("notifications").insert({
          user_id: userId,
          type: "tokens",
          title: `🎁 ${amount} jetons crédités`,
          description: "Votre recharge est confirmée.",
        });
      }
    }
  }

  if (context === "formation" && data.formationId) {
    await admin.from("formation_payments").upsert(
      {
        user_id: userId,
        formation_id: data.formationId,
        identifier: paymentId,
        tx_reference: paymentId,
        status: "success",
        paygate_status: "solimi_success",
        amount: tx.amount,
        raw_response: tx.provider_response,
      },
      { onConflict: "identifier" },
    );
    await admin.from("notifications").insert({
      user_id: userId,
      type: "formation",
      title: "✅ Formation débloquée",
      description: "Votre paiement est confirmé.",
    });
  }
}

/**
 * Persist a provider status change on the transaction and run the business
 * finalization exactly once (guarded by `completed_at`).
 */
export async function applyPaymentStatus(
  admin: any,
  existing: any,
  merchantReference: string,
  status: string,
  provider: Record<string, any>,
  extra: Record<string, unknown> = {},
) {
  const alreadyCompleted = !!existing?.completed_at;
  const failureReason = ["failed", "cancelled", "expired"].includes(status)
    ? String(provider?.failure_reason || provider?.message || status)
    : null;

  const { data: tx, error } = await admin
    .from("solimi_transactions")
    .update({
      status: alreadyCompleted && status !== "refunded" ? existing.status : status,
      checkout_reference: provider?.checkout_reference || existing?.checkout_reference || null,
      payment_reference: provider?.payment_reference || existing?.payment_reference || null,
      provider_response: provider,
      verified_at: new Date().toISOString(),
      completed_at: status === "success" ? existing?.completed_at || new Date().toISOString() : existing?.completed_at,
      refunded_at: status === "refunded" ? new Date().toISOString() : existing?.refunded_at,
      failure_reason: failureReason,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("merchant_reference", merchantReference)
    .select("*")
    .single();
  if (error) throw error;

  if (status === "success" && !alreadyCompleted) {
    try {
      await finalizePayment(admin, tx, merchantReference);
    } catch (e) {
      console.error("[solimi] finalizePayment error", e);
      await admin
        .from("solimi_transactions")
        .update({
          error_log: [
            ...(Array.isArray(tx.error_log) ? tx.error_log : []),
            { at: new Date().toISOString(), stage: "finalize", message: (e as Error).message },
          ],
        })
        .eq("merchant_reference", merchantReference);
      throw e;
    }
  }

  return tx;
}
