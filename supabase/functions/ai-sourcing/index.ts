import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BodySchema = z.object({
  need: z.string().min(3).max(1200),
  category: z.string().max(120).optional().nullable(),
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().max(40).optional().nullable(),
  budget: z.number().nonnegative().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  deadline: z.string().max(40).optional().nullable(),
  /** When true, also publish the need as a demand and notify matched suppliers. */
  broadcast: z.boolean().optional(),
});

const MODEL = "google/gemini-3.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Non authentifié" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "IA non configurée" }, 500);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Session invalide" }, 401);
    const userId = claims.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Candidate pool: approved, in-stock products, optionally narrowed by category/location.
    let query = admin
      .from("products")
      .select(
        "id, name, description, category, price, unit, quantity_available, min_order, location, city, country, is_organic, is_negotiable, shipping_delay_days, slug, images, producer_id",
      )
      .eq("moderation_status", "approved")
      .order("view_count", { ascending: false })
      .limit(120);

    if (input.category) query = query.ilike("category", `%${input.category}%`);
    const { data: products, error: prodErr } = await query;
    if (prodErr) return json({ error: prodErr.message }, 500);

    const producerIds = [...new Set((products || []).map((p: any) => p.producer_id).filter(Boolean))];
    const { data: suppliers } = producerIds.length
      ? await admin
          .from("profiles")
          .select("id, user_id, full_name, business_name, location, is_verified, user_type")
          .in("id", producerIds)
      : { data: [] };
    const supplierMap = new Map((suppliers || []).map((s: any) => [s.id, s]));

    const candidates = (products || []).map((p: any) => {
      const s = supplierMap.get(p.producer_id);
      return {
        product_id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price || 0),
        unit: p.unit,
        available: Number(p.quantity_available || 0),
        min_order: Number(p.min_order || 0),
        location: [p.city, p.country].filter(Boolean).join(", ") || p.location || "",
        organic: !!p.is_organic,
        negotiable: !!p.is_negotiable,
        delay_days: p.shipping_delay_days ?? null,
        supplier_name: s?.business_name || s?.full_name || "Fournisseur",
        supplier_verified: !!s?.is_verified,
        excerpt: String(p.description || "").slice(0, 200),
      };
    });

    if (!candidates.length) return json({ matches: [], summary: "Aucun produit disponible pour ce besoin." });

    // 2) AI ranking
    const prompt = `Besoin de l'acheteur : ${input.need}
Catégorie souhaitée : ${input.category || "non précisée"}
Quantité : ${input.quantity ?? "non précisée"} ${input.unit || ""}
Budget total indicatif : ${input.budget ? `${input.budget} FCFA` : "non précisé"}
Zone de livraison : ${input.location || "non précisée"}
Délai souhaité : ${input.deadline || "non précisé"}

Offres disponibles (JSON) :
${JSON.stringify(candidates)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Tu es un acheteur professionnel agricole africain. Tu sélectionnes les meilleures offres pour un besoin donné en tenant compte du prix, de la quantité disponible, de la proximité, du délai, de la certification bio et de la vérification du fournisseur. Réponds UNIQUEMENT en JSON valide, en français, sans texte autour, au format : {\"summary\": string, \"matches\": [{\"product_id\": string, \"score\": number, \"reason\": string, \"estimated_total\": number}]}. Classe au maximum 8 offres, du meilleur au moins bon. N'invente jamais un product_id absent de la liste.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Trop de requêtes IA, réessayez dans un instant." }, 429);
    if (aiRes.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!aiRes.ok) {
      console.error("[ai-sourcing] gateway error", aiRes.status, await aiRes.text());
      return json({ error: "Analyse IA indisponible" }, 502);
    }

    const aiJson = await aiRes.json();
    let ranked: { summary?: string; matches?: any[] } = {};
    try {
      ranked = JSON.parse(aiJson?.choices?.[0]?.message?.content || "{}");
    } catch {
      ranked = {};
    }

    const byId = new Map(candidates.map((c) => [c.product_id, c]));
    const productById = new Map((products || []).map((p: any) => [p.id, p]));
    const matches = (Array.isArray(ranked.matches) ? ranked.matches : [])
      .filter((m: any) => byId.has(String(m?.product_id)))
      .slice(0, 8)
      .map((m: any) => {
        const c = byId.get(String(m.product_id))!;
        const p: any = productById.get(String(m.product_id));
        const s = supplierMap.get(p?.producer_id);
        return {
          ...c,
          slug: p?.slug || null,
          image: Array.isArray(p?.images) ? p.images[0] : null,
          supplier_user_id: s?.user_id || null,
          supplier_profile_id: s?.id || null,
          score: Math.max(0, Math.min(100, Number(m.score) || 0)),
          reason: String(m.reason || "").slice(0, 400),
          estimated_total: Number(m.estimated_total) || (input.quantity ? c.price * input.quantity : c.price),
        };
      });

    // 3) Optional broadcast: publish the demand and alert matched suppliers.
    let demandId: string | null = null;
    if (input.broadcast) {
      const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
      const { data: demand, error: demandErr } = await admin
        .from("demands")
        .insert({
          user_id: userId,
          profile_id: profile?.id || null,
          title: input.need.slice(0, 120),
          description: input.need,
          category: input.category || "Autre",
          quantity: input.quantity ?? null,
          unit: input.unit || null,
          budget: input.budget ?? null,
          location: input.location || null,
          deadline: input.deadline || null,
          status: "open",
          auto_sourcing: true,
        })
        .select("id")
        .single();
      if (demandErr) console.error("[ai-sourcing] demand insert", demandErr);
      demandId = demand?.id || null;

      if (demandId) {
        const targets = [...new Set(matches.map((m) => m.supplier_user_id).filter(Boolean))];
        if (targets.length) {
          await admin.from("notifications").insert(
            targets.map((uid) => ({
              user_id: uid,
              type: "demand",
              title: "🎯 Nouvelle demande ciblée",
              description: `Un acheteur recherche : ${input.need.slice(0, 120)}. Proposez votre offre.`,
              link: `/besoins?demande=${demandId}`,
            })),
          );
        }
      }
    }

    return json({
      summary: String(ranked.summary || "").slice(0, 600),
      matches,
      demand_id: demandId,
      analyzed: candidates.length,
    });
  } catch (e) {
    console.error("[ai-sourcing]", e);
    return json({ error: (e as Error).message || "Erreur serveur" }, 500);
  }
});
