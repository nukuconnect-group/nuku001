import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["buyer", "producer"]),
  profile_id: z.string().uuid(),
  location: z.string().max(200).optional().nullable(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = claimsData.claims.sub as string;

    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { role, location } = parsed.data;
    // Force user_id from JWT — ignore client-supplied value to prevent impersonation
    const user_id = callerUserId;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve caller's own profile — never trust client-supplied profile_id
    const { data: profileRow } = await supabase
      .from("profiles").select("id").eq("user_id", user_id).maybeSingle();
    if (!profileRow?.id) {
      return new Response(JSON.stringify({ error: "Profil introuvable" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const profile_id = profileRow.id as string;

    // Préférences IA définies par l'utilisateur (personnalisation explicite)
    const { data: prefsRow } = await supabase
      .from("user_ai_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();
    const prefs = prefsRow || null;

    let contextData: any = {};

    if (role === "buyer") {
      const [ordersRes, wishlistRes, productsRes, formationsRes, profilesRes] = await Promise.all([
        supabase.from("orders").select("product_id, total_price, created_at, products(name, category, location)").eq("buyer_id", profile_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("wishlist").select("product_id").eq("user_id", user_id),
        supabase.from("products").select("id, name, category, price, unit, location, images, is_organic, producer_id, profiles!products_producer_id_fkey(full_name, avatar_url, is_verified, location)").order("created_at", { ascending: false }).limit(50),
        supabase.from("formations").select("id, title, category, level, rating, students_count").eq("is_published", true).limit(20),
        supabase.from("profiles").select("id, full_name, avatar_url, is_verified, location, user_type").eq("user_type", "producer").limit(30),
      ]);

      contextData = {
        orders: ordersRes.data || [],
        wishlist: wishlistRes.data || [],
        products: productsRes.data || [],
        formations: formationsRes.data || [],
        producers: profilesRes.data || [],
        userLocation: prefs?.preferred_region || location,
        preferences: prefs,
      };
    } else if (role === "producer") {
      const [myProductsRes, demandsRes, ordersRes, allProductsRes] = await Promise.all([
        supabase.from("products").select("id, name, category, price, quantity_available").eq("producer_id", profile_id),
        supabase.from("demands").select("id, title, category, quantity, budget, location, profile_id, profiles!demands_profile_id_fkey(full_name, location)").eq("status", "active").limit(30),
        supabase.from("orders").select("product_id, quantity, total_price, created_at, products(name, category)").eq("seller_id", profile_id).order("created_at", { ascending: false }).limit(30),
        supabase.from("products").select("category, price").order("created_at", { ascending: false }).limit(100),
      ]);

      contextData = {
        myProducts: myProductsRes.data || [],
        demands: demandsRes.data || [],
        orders: ordersRes.data || [],
        marketProducts: allProductsRes.data || [],
        userLocation: prefs?.preferred_region || location,
        preferences: prefs,
      };
    }

    const systemPrompt = role === "buyer"
      ? `Tu es un moteur de recommandation intelligent pour une marketplace agricole africaine. Analyse les données utilisateur et retourne des recommandations personnalisées au format JSON strict.`
      : `Tu es un conseiller IA pour les fournisseurs d'une marketplace agricole africaine. Analyse les données du fournisseur et du marché pour générer des recommandations business au format JSON strict.`;

    const userPrompt = role === "buyer"
      ? `Données utilisateur:
- Préférences déclarées par l'utilisateur (PRIORITAIRES): ${JSON.stringify(prefs || "aucune")}
- Historique commandes: ${prefs && prefs.use_purchase_history === false ? "ignoré à la demande de l'utilisateur" : JSON.stringify(contextData.orders?.slice(0, 10))}
- Favoris: ${JSON.stringify(contextData.wishlist?.slice(0, 10))}
- Localisation: ${contextData.userLocation || "non spécifiée"}
- Produits disponibles: ${JSON.stringify(contextData.products?.slice(0, 20))}
- Formations: ${JSON.stringify(contextData.formations?.slice(0, 10))}
- Fournisseurs: ${JSON.stringify(contextData.producers?.slice(0, 15))}

Retourne uniquement un JSON valide avec cette structure exacte:
{
  "recommended_products": [{"id": "uuid", "reason": "raison courte"}],
  "similar_products": [{"id": "uuid", "reason": "raison courte"}],
  "nearby_suppliers": [{"id": "uuid", "reason": "raison courte"}],
  "recommended_formations": [{"id": "uuid", "reason": "raison courte"}]
}
Maximum 6 éléments par catégorie. Utilise UNIQUEMENT les IDs fournis dans les données.`
      : `Données fournisseur:
- Préférences déclarées par le fournisseur (PRIORITAIRES): ${JSON.stringify(prefs || "aucune")}
- Mes produits: ${JSON.stringify(contextData.myProducts)}
- Demandes actives: ${JSON.stringify(contextData.demands?.slice(0, 15))}
- Mes commandes: ${JSON.stringify(contextData.orders?.slice(0, 10))}
- Tendances marché: ${JSON.stringify(contextData.marketProducts?.slice(0, 20))}
- Localisation: ${contextData.userLocation || "non spécifiée"}

Retourne uniquement un JSON valide avec cette structure exacte:
{
  "potential_clients": [{"demand_id": "uuid", "buyer_name": "nom", "reason": "raison courte"}],
  "trending_products": [{"category": "catégorie", "avg_price": 0, "demand_count": 0, "suggestion": "conseil"}],
  "ai_suggestions": [{"type": "add_product|adjust_price|enable_delivery", "title": "titre court", "description": "description actionnable"}]
}
Maximum 5 éléments par catégorie.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + " Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte additionnel." },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const empty = role === "buyer"
        ? { recommended_products: [], similar_products: [], nearby_suppliers: [], recommended_formations: [] }
        : { potential_clients: [], trending_products: [], ai_suggestions: [] };
      const reason = response.status === 429 ? "rate_limited" : response.status === 402 ? "credits_exhausted" : `ai_error_${response.status}`;
      console.warn("AI gateway unavailable, returning fallback:", reason);
      return new Response(JSON.stringify({ recommendations: empty, context: {}, fallback: true, reason }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    let recommendations;
    try {
      recommendations = JSON.parse(jsonStr.trim());
    } catch {
      recommendations = role === "buyer"
        ? { recommended_products: [], similar_products: [], nearby_suppliers: [], recommended_formations: [] }
        : { potential_clients: [], trending_products: [], ai_suggestions: [] };
    }

    return new Response(JSON.stringify({ recommendations, context: contextData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-recommendations error:", e);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
