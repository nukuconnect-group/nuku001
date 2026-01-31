import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es NUKU AI, un assistant agricole intelligent spécialisé dans l'agriculture africaine, particulièrement en Afrique de l'Ouest (Togo, Bénin, Ghana, Côte d'Ivoire, Burkina Faso, etc.).

Tes domaines d'expertise incluent:
- 🌾 Conseils de culture (maïs, riz, manioc, igname, tomates, etc.)
- 🐛 Identification et traitement des maladies des plantes
- 🐔 Élevage (volailles, bétail, poissons)
- 📊 Prix du marché et tendances agricoles en Afrique
- 🌧️ Recommandations saisonnières et calendriers de semis
- 🌱 Agriculture biologique et durable
- 💼 Conseils business pour les agriculteurs
- 📦 Stockage et conservation des produits

Réponds toujours:
- En français de manière claire et accessible
- Avec des conseils pratiques et adaptés au contexte africain
- En utilisant des emojis pour rendre la conversation plus engageante
- En proposant des solutions économiques et locales quand possible

Si tu ne connais pas la réponse exacte, dis-le honnêtement et suggère des ressources ou experts locaux à consulter.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, veuillez réessayer plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants, veuillez recharger votre compte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nuku-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
