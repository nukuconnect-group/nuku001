// Generate a marketing product description via Lovable AI Gateway (Gemini).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI non configurée" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const category = String(body?.category || "").trim();
    const unit = String(body?.unit || "").trim();
    const location = String(body?.location || "").trim();
    const is_organic = !!body?.is_organic;
    const hints = String(body?.hints || "").trim();

    if (!name) {
      return new Response(JSON.stringify({ error: "Le nom du produit est requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = "Tu es un rédacteur marketing pour une marketplace agricole africaine (NukuConnect). " +
      "Tu écris en français, ton chaleureux, factuel, sans superlatifs creux. Pas d'emoji excessif. " +
      "Mets en avant : qualité, origine, conditionnement, mode de culture/élevage, conditions de stockage, " +
      "et un appel à l'action discret. Longueur : 90 à 150 mots, 2-3 paragraphes courts.";

    const user = `Rédige la description du produit suivant :
- Nom : ${name}
${category ? `- Catégorie : ${category}` : ""}
${unit ? `- Unité de vente : ${unit}` : ""}
${location ? `- Origine / localisation : ${location}` : ""}
${is_organic ? "- Produit biologique (sans pesticides chimiques)" : ""}
${hints ? `- Détails fournis par le vendeur : ${hints}` : ""}

Réponds uniquement avec le texte final de la description, sans titre, sans guillemets, sans listes à puces.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Limite atteinte, réessayez dans un instant." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez du crédit à votre espace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      return new Response(JSON.stringify({ error: "Erreur génération IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const description = String(json?.choices?.[0]?.message?.content || "").trim();
    if (!description) {
      return new Response(JSON.stringify({ error: "Réponse vide" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-description error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
