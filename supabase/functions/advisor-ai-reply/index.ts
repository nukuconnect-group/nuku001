// Auto-reply advisor for premium account managers using Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Tu es Nuku Conseiller, account manager premium pour NukuConnect (marketplace agricole en Afrique).
- Tu réponds en français, ton chaleureux et professionnel.
- Tu es expert sur : produits, abonnements (Pro/Premium/Business), jetons, livraisons, traçabilité, formations, paiements.
- Sois concis (3-6 phrases), oriente toujours vers une action concrète (lien : /plans, /jetons, /dashboard, /premium?tab=api).
- Utilise le CONTEXTE UTILISATEUR (plan, expiration, jetons, produits, commandes) pour personnaliser la réponse.
- Termine TOUJOURS par une ligne « 👉 Action conseillée : … » avec une action claire et un lien si pertinent.
- Si la question dépasse tes capacités : "Je transmets à l'équipe NukuConnect."
- N'invente pas de tarifs ni de fonctionnalités absentes.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require a valid JWT — the caller can only request advice for themselves
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7).trim();
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUserId = claimsData.claims.sub as string;

    const body = await req.json();
    const { ticket_id, user_message } = body || {};
    // Force user_id from JWT — ignore any client-supplied value
    const user_id = authUserId;
    if (!user_message) {
      return new Response(JSON.stringify({ error: "user_message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve caller's profile id once
    const { data: callerProfile } = await admin
      .from("profiles").select("id, full_name, business_name, user_type")
      .eq("user_id", user_id).maybeSingle();
    const profileId = (callerProfile as any)?.id || "";

    // Fetch user context: subscription, tokens, recent activity
    const [historyRes, subRes, tokenRes, productsRes, ordersRes] = await Promise.all([
      admin.from("support_messages").select("content, sender_role, created_at").eq("user_id", user_id).order("created_at", { ascending: true }).limit(10),
      admin.from("subscriptions").select("plan, status, expires_at, max_products").eq("user_id", user_id).maybeSingle(),
      admin.rpc("get_user_token_balance", { p_user_id: user_id }),
      admin.from("products").select("id, moderation_status").eq("producer_id", profileId),
      profileId
        ? admin.from("orders").select("id, status, total_price, created_at").or(`seller_id.eq.${profileId},buyer_id.eq.${profileId}`).order("created_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: [] } as any),
    ]);

    const history = historyRes.data || [];
    const sub = subRes.data as any;
    const tokenBalance = typeof tokenRes.data === "number" ? tokenRes.data : 0;
    const profile = callerProfile as any;
    const products = (productsRes.data as any[]) || [];
    const recentOrders = (ordersRes.data as any[]) || [];

    const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;
    const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
    const activeProducts = products.filter((p) => p.moderation_status === "approved").length;
    const pendingProducts = products.filter((p) => p.moderation_status === "pending").length;

    const userContext = `CONTEXTE UTILISATEUR (à utiliser pour personnaliser ta réponse) :
- Nom : ${profile?.full_name || "Non renseigné"}${profile?.business_name ? " (" + profile.business_name + ")" : ""}
- Type de compte : ${profile?.user_type || "buyer"}
- Plan d'abonnement : ${sub?.plan || "free"} (${sub?.status || "n/a"})${expiresAt ? ` — ${isExpired ? "EXPIRÉ depuis " + Math.abs(daysLeft!) + "j" : "expire dans " + daysLeft + "j"}` : ""}
- Quota produits : ${activeProducts}/${sub?.max_products || "—"} actifs${pendingProducts ? `, ${pendingProducts} en modération` : ""}
- Solde jetons : ${tokenBalance} ${tokenBalance < 5 ? "⚠️ FAIBLE" : ""}
- Commandes récentes : ${recentOrders.length} (${recentOrders.filter((o) => o.status === "completed").length} complétées)`;

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "system", content: userContext },
      ...history.map((m: any) => ({
        role: m.sender_role === "admin" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: user_message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      const status = aiRes.status === 429 ? 429 : aiRes.status === 402 ? 402 : 500;
      const msg = aiRes.status === 429 ? "Trop de requêtes, réessayez dans quelques instants."
        : aiRes.status === 402 ? "Crédits IA insuffisants. Rechargez l'espace de travail."
        : "Erreur de génération.";
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Merci pour votre message, un conseiller revient vers vous.";

    // Insert AI reply as admin message
    await admin.from("support_messages").insert({
      user_id,
      content: reply,
      sender_role: "admin",
      user_name: "Nuku Conseiller",
      subject: "Réponse automatique IA",
      ticket_id: ticket_id || crypto.randomUUID(),
    });

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
