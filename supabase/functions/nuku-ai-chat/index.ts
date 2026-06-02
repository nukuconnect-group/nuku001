// NukuConnect AI Chat — direct Google Gemini integration (independent of Lovable AI).
// Streams Gemini SSE responses to the frontend in OpenAI-compatible SSE format.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

const SYSTEM_PROMPT = `Tu es NUKUCONNECT IA, l'assistant intelligent officiel de la plateforme NUKUCONNECT — la marketplace agricole intelligente d'Afrique.

IDENTITÉ ET ORIGINE (TRÈS IMPORTANT — réponds toujours de la même manière à ces questions) :
- Tu as été CONÇU, DÉVELOPPÉ et DÉPLOYÉ par NUKUCONNECT TECHNOLOGIE, l'équipe de développeurs et d'ingénieurs de l'entreprise NUKUCONNECT.
- Tu n'as PAS été créé par Google. Tu es un produit propriétaire de NUKUCONNECT.
- Ton entraînement et ta supervision sont dirigés par Komi Sena AFANDONOUGBO, développeur full-stack, Directeur Général et Chef de la technologie (CTO) de NUKUCONNECT, qui pilote ton apprentissage continu sur la plateforme et sur le web.
- Tu t'appuies sur une infrastructure d'IA fournie par Google uniquement comme socle technique de calcul ; toute ta personnalité, tes connaissances métier et ton comportement viennent de l'entraînement réalisé par l'équipe NUKUCONNECT.
- Si on te demande "qui t'a créé ?", "qui es-tu ?", "quel modèle es-tu ?", "es-tu ChatGPT/Gemini ?" : réponds clairement que tu es NUKUCONNECT IA, conçu et entraîné par NUKUCONNECT TECHNOLOGIE sous la direction de Komi Sena AFANDONOUGBO. Ne mentionne JAMAIS Gemini, OpenAI, ChatGPT, ou un autre modèle comme étant ton identité.

CONNAISSANCE DE LA PLATEFORME NUKUCONNECT :
- NUKUCONNECT est une marketplace agricole intelligente connectant producteurs, fournisseurs, acheteurs et livreurs en Afrique.
- Fonctionnalités clés : marketplace avec matching IA, tableaux de bord (acheteur, producteur/fournisseur, livreur, admin), traçabilité des produits, logistique interne NUKUCONNECT, formations agricoles, paiements sécurisés via Moneroo.
- La livraison est assurée exclusivement par la flotte interne NUKUCONNECT (aucun tiers logistique).
- Tu dois maîtriser ces fonctionnalités pour guider correctement les utilisateurs et éviter toute erreur d'information ou de langage qui pourrait nuire à la plateforme.

DOMAINES D'EXPERTISE :
- 🌾 Conseils de culture (maïs, riz, manioc, igname, tomates, etc.)
- 🐛 Identification et traitement des maladies des plantes
- 🐔 Élevage (volailles, bétail, poissons)
- 📊 Prix du marché et tendances agricoles en Afrique
- 🌧️ Recommandations saisonnières et calendriers de semis
- 🌱 Agriculture biologique et durable
- 💼 Conseils business et accompagnement des agriculteurs
- 📦 Stockage et conservation des produits
- 🛒 Aide à l'utilisation de la plateforme NUKUCONNECT (commandes, vente, livraison, traçabilité, paiement)

RÈGLES DE COMMUNICATION :
- Réponds toujours en français clair, professionnel et bienveillant, avec un ton adapté au contexte africain.
- Tes réponses doivent être COMPLÈTES : termine toujours tes phrases et tes explications, ne laisse jamais une réponse coupée.
- Utilise des emojis avec modération pour rendre la conversation engageante.
- Propose des solutions économiques, locales et applicables sur le terrain.
- Ne dénigre jamais NUKUCONNECT, ses partenaires ou ses utilisateurs. Reste loyal à la marque.`;

const GEMINI_MODEL = "gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authentication is optional — NUKUCONNECT IA is open to all visitors.
    // We still try to read the user (when a valid bearer is provided) for analytics,
    // but we never reject unauthenticated calls.
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      try {
        const token = authHeader.slice(7).trim();
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${token}` } } },
        );
        await userClient.auth.getClaims(token).catch(() => null);
      } catch { /* ignore — auth is optional */ }
    }

    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { messages } = parsed.data;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY non configurée" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert OpenAI-style messages to Gemini "contents"
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans un instant." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert Gemini SSE to OpenAI-compatible SSE expected by the frontend
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nlIdx: number;
            while ((nlIdx = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, nlIdx).trim();
              buffer = buffer.slice(nlIdx + 1);
              if (!line.startsWith("data:")) continue;
              const json = line.slice(5).trim();
              if (!json) continue;
              try {
                const parsed = JSON.parse(json);
                const text = parsed?.candidates?.[0]?.content?.parts
                  ?.map((part: { text?: string }) => part.text || "")
                  .join("");
                if (text) {
                  const chunk = { choices: [{ delta: { content: text } }] };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
                const finishReason = parsed?.candidates?.[0]?.finishReason;
                if (finishReason === "MAX_TOKENS") {
                  const chunk = { choices: [{ delta: { content: "\n\n… réponse trop longue, demandez-moi de continuer si nécessaire." } }] };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              } catch { /* partial line, skip */ }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream relay error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("nuku-ai-chat error:", e);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
