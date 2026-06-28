// Generates a photorealistic image illustrating a buyer's demand using
// Lovable AI Gateway (Gemini image model). Returns a data URL the client
// can preview or upload to storage as a regular file.
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
    const title = String(body?.title || "").trim();
    const category = String(body?.category || "").trim();
    const description = String(body?.description || "").trim();
    if (!title && !description) {
      return new Response(JSON.stringify({ error: "Titre ou description requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Photo réaliste, lumineuse, professionnelle d'un produit agricole pour une demande d'achat sur une marketplace africaine.
Sujet : ${title}
${category ? `Catégorie : ${category}` : ""}
${description ? `Détails : ${description}` : ""}
Style : photo produit éditoriale, fond neutre clair, mise au point nette, sans texte ni filigrane.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Limite IA atteinte, réessayez dans un instant." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez du crédit." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI image gateway error", res.status, t);
      return new Response(JSON.stringify({ error: "Erreur génération image IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("AI image empty response", JSON.stringify(json).slice(0, 500));
      return new Response(JSON.stringify({ error: "Image IA vide" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ image: `data:image/png;base64,${b64}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-demand-image error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
