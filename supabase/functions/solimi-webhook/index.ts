import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, json, normalizeStatus, safeEqual } from "../_shared/solimi.ts";
import { applyPaymentStatus } from "../_shared/solimi-finalize.ts";

/**
 * SOLIMI payment webhook.
 * URL: https://<project>.functions.supabase.co/functions/v1/solimi-webhook
 *
 * Authenticity: SOLIMI sends the shared webhook secret in `x-solimi-signature`
 * plus a Unix timestamp in `x-solimi-timestamp` (max 5 min old).
 */
const TOLERANCE_SECONDS = 300;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const secret = Deno.env.get("SOLIMI_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[solimi-webhook] SOLIMI_WEBHOOK_SECRET missing");
    return json({ error: "Webhook non configuré" }, 500);
  }

  const signature = req.headers.get("x-solimi-signature") || "";
  const timestampHeader = req.headers.get("x-solimi-timestamp") || "";
  const event = req.headers.get("x-solimi-event") || "";

  if (!signature || !safeEqual(signature, secret)) {
    console.warn("[solimi-webhook] invalid signature");
    return json({ error: "Signature invalide" }, 401);
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return json({ error: "Timestamp invalide" }, 400);
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > TOLERANCE_SECONDS) {
    return json({ error: "Timestamp expiré" }, 400);
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Payload invalide" }, 400);
  }

  const payment = payload?.payment || payload?.data || payload || {};
  const merchantReference = String(payment?.merchant_reference || "").trim();
  if (!merchantReference) return json({ error: "merchant_reference manquant" }, 400);

  const status = normalizeStatus(payment?.status || event);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin
      .from("solimi_transactions")
      .select("*")
      .eq("merchant_reference", merchantReference)
      .maybeSingle();

    if (!existing) {
      console.warn("[solimi-webhook] unknown merchant_reference", merchantReference);
      // 200 so SOLIMI does not retry forever on an unknown reference.
      return json({ received: true, ignored: true, merchant_reference: merchantReference });
    }

    await applyPaymentStatus(admin, existing, merchantReference, status, payment, { last_event: event || null });

    return json({
      received: true,
      event,
      merchant_reference: merchantReference,
      solimi_reference: payment?.checkout_reference || payment?.reference || null,
      status,
    });
  } catch (e) {
    console.error("[solimi-webhook] processing error", e);
    // Non-2xx => SOLIMI retries at 30s / 60s / 300s / 900s.
    return json({ error: (e as Error).message || "Erreur serveur" }, 500);
  }
});
