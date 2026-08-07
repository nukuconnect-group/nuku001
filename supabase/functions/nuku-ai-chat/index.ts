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

CONNAISSANCE DE LA PLATEFORME NUKUCONNECT (tu dois maîtriser tout le site) :
- NUKUCONNECT est une marketplace agricole intelligente connectant producteurs, fournisseurs, acheteurs et livreurs en Afrique.
- Pages principales : / (accueil), /marketplace (catalogue produits), /produit/:slug (détail produit), /producteurs (annuaire fournisseurs), /formations (cours agricoles), /traceability (traçabilité), /cart (panier), /mes-commandes (commandes), /delivery-tracking (suivi livraison), /nuku-ai (toi), /plans (abonnements), /affiliation (parrainage), /auth (connexion), /dashboard (tableaux de bord par rôle).
- Rôles : Acheteur, Producteur/Fournisseur, Livreur, Apprenant, Admin — chaque rôle a son tableau de bord dédié.
- Fonctionnalités clés : matching IA, traçabilité produits, logistique interne NUKUCONNECT, formations, paiements sécurisés via SOLIMI, KYC photo en direct, suivi GPS livreur en temps réel, badge vérifié Pro/Business, programme d'affiliation (10% abonnement / 3% achat).
- La livraison est assurée EXCLUSIVEMENT par la flotte interne NUKUCONNECT (aucun tiers logistique).

PRODUITS DE LA MARKETPLACE — RÔLE CLÉ :
- Tu DOIS pouvoir répondre aux questions sur les produits disponibles : "as-tu du maïs ?", "quels sont les prix des tomates ?", "je veux acheter du riz", "montre-moi des produits bio", etc.
- Quand un contexte produits est injecté ci-dessous (CONTEXTE PRODUITS NUKUCONNECT), utilise-le comme source de vérité absolue : noms, prix, disponibilités, lieux, images et liens viennent de la base de données réelle de la marketplace.
- Affiche TOUJOURS l'image du produit et le lien "Voir et acheter le produit" quand un utilisateur exprime une intention d'achat ("je veux payer X", "comment acheter Y", "as-tu Z ?").
- N'invente JAMAIS un produit, un prix ou une image. Si rien ne correspond, dis-le honnêtement et oriente vers /marketplace.

APPRENTISSAGE CONTINU :
- Chaque conversation t'aide à mieux comprendre les besoins des utilisateurs NUKUCONNECT. Mémorise le contexte de la conversation en cours (historique fourni à chaque tour) et adapte tes réponses aux préférences, à la localisation et au profil exprimés par l'utilisateur.
- Si l'utilisateur précise une ville, un type de culture ou un budget, garde ces infos en tête pour le reste de l'échange.

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

// In-memory IP/user rate limiter (per Edge Function instance) to protect
// Gemini API quota from anonymous abuse while keeping the assistant open.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_ANON = 20;
const RATE_LIMIT_AUTH = 60;
const rateBuckets = new Map<string, number[]>();
function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= max) { rateBuckets.set(key, arr); return false; }
  arr.push(now);
  rateBuckets.set(key, arr);
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authentication is optional — NUKUCONNECT IA is open to all visitors.
    // We still try to read the user (when a valid bearer is provided) for analytics
    // and to grant a higher rate limit.
    let authUserId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      try {
        const token = authHeader.slice(7).trim();
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${token}` } } },
        );
        const { data } = await userClient.auth.getClaims(token).catch(() => ({ data: null } as any));
        authUserId = (data as any)?.claims?.sub ?? null;
      } catch { /* ignore — auth is optional */ }
    }

    // Rate limit by user id when authenticated, otherwise by client IP
    const clientIp = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    const rlKey = authUserId ? `u:${authUserId}` : `ip:${clientIp}`;
    const rlMax = authUserId ? RATE_LIMIT_AUTH : RATE_LIMIT_ANON;
    if (!rateLimit(rlKey, rlMax)) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "600" },
      });
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

    // ───────────────────────────────────────────────────────────────
    // Product context injection from the marketplace
    // ───────────────────────────────────────────────────────────────
    const STOP_WORDS = new Set([
      "le","la","les","un","une","des","de","du","et","ou","aux","dans","sur","pour","par","avec","sans",
      "je","tu","il","elle","nous","vous","ils","elles","mon","ma","mes","ton","ta","tes","son","sa","ses","ce","cette","ces",
      "qui","que","quoi","quel","quelle","est","sont","ont","veux","voudrais","cherche","cherchez","acheter",
      "payer","commander","trouver","besoin","produit","produits","disponible","disponibles","prix","stock",
      "fournisseur","fournisseurs","vendeur","montre","montrez","affiche","affichez","detail","detaille",
      "the","want","buy","need","please","show","find"
    ]);
    function extractKeywords(text: string): string[] {
      return text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
        .slice(0, 8);
    }

    let productContext = "";
    try {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const keywords = extractKeywords(lastUserMsg);
      if (keywords.length > 0) {
        const supaUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const admin = createClient(supaUrl, serviceKey);
        const orFilter = keywords
          .flatMap((k) => [`name.ilike.%${k}%`, `description.ilike.%${k}%`, `category.ilike.%${k}%`, `city.ilike.%${k}%`])
          .join(",");
        const { data: prods } = await admin
          .from("products")
          .select("id,name,description,category,price,unit,quantity_available,stock_status,city,country,location,images,slug,is_organic")
          .eq("moderation_status", "approved")
          .or(orFilter)
          .order("quantity_available", { ascending: false })
          .limit(6);

        if (prods && prods.length > 0) {
          const siteOrigin = "https://nukuconnect.com";
          const lines = prods.map((p: any, i: number) => {
            const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "";
            const link = `${siteOrigin}/produit/${p.slug || p.id}`;
            const place = [p.city, p.country].filter(Boolean).join(", ") || p.location || "Non précisé";
            const stock = p.stock_status === "in_stock" ? `${p.quantity_available} ${p.unit} disponible(s)` : "Rupture de stock";
            return `${i + 1}. ${p.name}
   - Catégorie: ${p.category}${p.is_organic ? " (Bio)" : ""}
   - Prix: ${p.price} FCFA / ${p.unit}
   - Disponibilité: ${stock}
   - Lieu: ${place}
   - Image: ${img}
   - Lien achat: ${link}
   - Description: ${(p.description || "").slice(0, 200)}`;
          }).join("\n\n");
          productContext = `\n\nCONTEXTE PRODUITS NUKUCONNECT (résultats réels de la marketplace pour la question de l'utilisateur) :
${lines}

INSTRUCTIONS DE FORMATAGE DES PRODUITS :
- Si la question concerne un achat, une disponibilité, un prix ou un produit spécifique, présente CHAQUE produit pertinent ci-dessus sous forme de carte markdown :
  ![nom](URL_image)
  **Nom du produit** — Prix FCFA / unité
  📍 Lieu · 📦 Disponibilité
  [Voir et acheter le produit](URL_lien)
- N'invente JAMAIS de produits, prix ou images. Utilise uniquement les données ci-dessus.
- Si aucun produit listé ne correspond vraiment à la demande, dis-le clairement et propose à l'utilisateur d'explorer /marketplace.`;
        } else {
          productContext = `\n\nCONTEXTE PRODUITS NUKUCONNECT : aucun produit ne correspond aux mots-clés "${keywords.join(", ")}" dans la marketplace en ce moment. Si l'utilisateur cherche à acheter, invite-le à reformuler ou à explorer la page /marketplace.`;
        }
      }
    } catch (e) {
      console.warn("product context lookup failed:", (e as Error)?.message);
    }

    const finalSystemPrompt = SYSTEM_PROMPT + productContext;

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
        systemInstruction: { parts: [{ text: finalSystemPrompt }] },
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
