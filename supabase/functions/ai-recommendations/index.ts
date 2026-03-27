import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, role, profile_id, location } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Gather context data based on role
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
        userLocation: location,
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
        userLocation: location,
      };
    }

    // Build prompt for AI
    const systemPrompt = role === "buyer"
      ? `Tu es un moteur de recommandation intelligent pour une marketplace agricole africaine. Analyse les données utilisateur et retourne des recommandations personnalisées au format JSON strict.`
      : `Tu es un conseiller IA pour les fournisseurs d'une marketplace agricole africaine. Analyse les données du fournisseur et du marché pour générer des recommandations business au format JSON strict.`;

    const userPrompt = role === "buyer"
      ? `Données utilisateur:
- Historique commandes: ${JSON.stringify(contextData.orders?.slice(0, 10))}
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
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Extract JSON from response (handle markdown code blocks)
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
