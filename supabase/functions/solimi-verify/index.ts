import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, json, solimiRequest, normalizeStatus } from "../_shared/solimi.ts";
import { applyPaymentStatus } from "../_shared/solimi-finalize.ts";

/**
 * Fallback status check (polling) for a SOLIMI checkout session.
 * The webhook is the primary source of truth; this endpoint lets the buyer
 * force a verification from the payment callback / tracking page.
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
    const merchantReference = String(body?.payment_id || body?.merchant_reference || "").trim();
    if (!merchantReference) return json({ error: "Référence de paiement manquante" }, 400);

    const admin = createClient(url, service);
    const { data: existing } = await admin
      .from("solimi_transactions")
      .select("*")
      .eq("merchant_reference", merchantReference)
      .maybeSingle();

    if (!existing) return json({ error: "Transaction introuvable" }, 404);
    if (existing.user_id !== user.id) return json({ error: "Paiement non autorisé" }, 403);

    // Already settled — no need to call SOLIMI again.
    if (existing.completed_at && existing.status === "success") {
      return json({ success: true, status: "success", transaction: existing });
    }

    const reference = existing.checkout_reference || merchantReference;
    const res = await solimiRequest<any>(`/v1/checkout/sessions/${encodeURIComponent(reference)}`);
    if (!res.ok) {
      return json({ error: res.error || "Vérification SOLIMI impossible", status: existing.status }, 502);
    }

    const provider = res.data?.data || res.data || {};
    const status = normalizeStatus(provider?.status);
    const tx = await applyPaymentStatus(admin, existing, merchantReference, status, provider);

    return json({ success: status === "success", status, transaction: tx });
  } catch (e) {
    console.error("[solimi-verify]", e);
    return json({ error: (e as Error).message || "Erreur serveur" }, 500);
  }
});
