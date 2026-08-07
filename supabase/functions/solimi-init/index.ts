import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, json, solimiRequest, normalizeStatus } from "../_shared/solimi.ts";

/**
 * Creates a SOLIMI hosted checkout session and records the transaction.
 * Returns the payment_url the client must be redirected to.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Session invalide" }, 401);

    const body = await req.json().catch(() => ({}));
    const amount = Math.round(Number(body?.amount || 0));
    if (!amount || amount <= 0) return json({ error: "Montant invalide" }, 400);

    const currency = String(body?.currency || "XOF");
    const description = String(body?.description || "Paiement NUKUCONNECT").slice(0, 200);
    const metadata = (body?.metadata && typeof body.metadata === "object") ? body.metadata : {};
    const context = String(metadata.context || "direct");
    const { context: _ctx, ...contextData } = metadata as Record<string, unknown>;

    const customer = body?.customer || {};
    const email = String(customer?.email || user.email || "");
    const nameParts = String(user.user_metadata?.full_name || "").trim().split(/\s+/).filter(Boolean);
    const firstName = String(customer?.first_name || nameParts[0] || email.split("@")[0] || "Client");
    const lastName = String(customer?.last_name || nameParts.slice(1).join(" ") || "Nukuconnect");
    const phone = String(customer?.phone || user.user_metadata?.phone || "").replace(/\D/g, "");

    // Unique, idempotent merchant reference for this payment attempt.
    const merchantReference = `NKC-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const admin = createClient(url, service);
    const { error: insertErr } = await admin.from("solimi_transactions").insert({
      user_id: user.id,
      payment_id: merchantReference,
      merchant_reference: merchantReference,
      status: "pending",
      amount,
      currency,
      context,
      context_data: contextData,
      description,
      customer_email: email,
      provider_response: {},
    });
    if (insertErr) return json({ error: insertErr.message }, 500);

    const payload: Record<string, unknown> = {
      merchant_reference: merchantReference,
      amount,
      description,
      customer_email: email,
      customer_first_name: firstName,
      customer_last_name: lastName,
    };
    if (phone) payload.customer_phone = phone;
    if (body?.return_url) {
      payload.success_url = String(body.return_url);
      payload.cancel_url = String(body.return_url);
      payload.failure_url = String(body.return_url);
    }

    const res = await solimiRequest<any>("/v1/checkout/sessions", {
      method: "POST",
      body: payload,
      idempotencyKey: merchantReference,
    });

    const session = res.data?.data || res.data || {};
    const paymentUrl = session?.payment_url || session?.checkout_url;

    if (!res.ok || !paymentUrl) {
      const message = res.error || "Impossible d'initialiser le paiement SOLIMI";
      console.error("[solimi-init] error", res.status, JSON.stringify(res.data));
      await admin
        .from("solimi_transactions")
        .update({
          status: "failed",
          failure_reason: message,
          provider_response: res.data || {},
          error_log: [{ at: new Date().toISOString(), stage: "init", status: res.status, message }],
        })
        .eq("merchant_reference", merchantReference);
      return json({ error: message }, 502);
    }

    await admin
      .from("solimi_transactions")
      .update({
        status: normalizeStatus(session?.status),
        checkout_url: paymentUrl,
        checkout_reference: session?.checkout_reference || null,
        provider_response: session,
      })
      .eq("merchant_reference", merchantReference);

    return json({
      checkout_url: paymentUrl,
      payment_url: paymentUrl,
      payment_id: merchantReference,
      merchant_reference: merchantReference,
      checkout_reference: session?.checkout_reference || null,
      expires_at: session?.expires_at || null,
    });
  } catch (e) {
    console.error("[solimi-init]", e);
    return json({ error: (e as Error).message || "Erreur serveur" }, 500);
  }
});
