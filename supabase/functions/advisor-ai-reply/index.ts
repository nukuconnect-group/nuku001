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
    const { ticket_id, user_id, user_message } = await req.json();
    if (!user_id || !user_message) {
      return new Response(JSON.stringify({ error: "user_id and user_message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Last 8 turns for context
    const { data: history } = await admin
      .from("support_messages")
      .select("content, sender_role, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true })
      .limit(8);

    const messages = [
      { role: "system", content: SYSTEM },
      ...(history || []).map((m: any) => ({
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
