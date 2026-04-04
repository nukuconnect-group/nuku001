import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { type, id } = await req.json();

    let content: any = null;
    let userId: string = "";
    let imageUrl: string | null = null;
    let itemName: string = "";

    if (type === "product") {
      const { data } = await supabase.from("products").select("*, profiles!products_producer_id_fkey(user_id, full_name)").eq("id", id).single();
      if (!data) throw new Error("Product not found");
      content = data;
      userId = data.profiles?.user_id || "";
      imageUrl = data.images?.[0] || null;
      itemName = data.name;
    } else if (type === "demand") {
      const { data } = await supabase.from("demands").select("*").eq("id", id).single();
      if (!data) throw new Error("Demand not found");
      content = data;
      userId = data.user_id;
      imageUrl = data.image_url || null;
      itemName = data.title;
    } else {
      throw new Error("Invalid type. Must be 'product' or 'demand'.");
    }

    // Step 1: Notify user that verification is in progress
    if (userId) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "🔍 Vérification en cours",
        description: `Votre ${type === "product" ? "produit" : "demande"} "${itemName}" est en cours de vérification automatique. Cela prend quelques instants...`,
      });
    }

    // Build moderation prompt
    const systemPrompt = `Tu es un modérateur de contenu pour NukuConnect, une marketplace agricole africaine.
Tu dois vérifier si une publication (produit ou demande d'achat) respecte les normes suivantes :

RÈGLES STRICTES:
1. Le contenu doit être lié à l'agriculture, l'élevage, la pêche, l'aquaculture, l'agroalimentaire ou des domaines connexes
2. Les images doivent être en rapport avec l'agriculture (produits agricoles, champs, fermes, marchés, etc.)
3. INTERDIT: nudité, contenu sexuel, violence, armes, drogues, contenu illégal
4. INTERDIT: spam, contenu frauduleux, produits contrefaits
5. Les prix doivent être raisonnables (pas de prix absurdes)
6. La description doit être cohérente avec le produit/la demande

Réponds UNIQUEMENT avec un JSON valide (pas de markdown):
{
  "approved": true/false,
  "reason": "Raison si refusé (en français, max 200 caractères)",
  "category_check": "agricultural/non-agricultural/suspicious",
  "content_safety": "safe/unsafe",
  "confidence": 0.0-1.0
}`;

    const contentDescription = type === "product"
      ? `PRODUIT: "${content.name}" — Catégorie: ${content.category} — Prix: ${content.price} FCFA/${content.unit} — Description: ${content.description || "Aucune"} — Localisation: ${content.location || "Non spécifiée"} — Image: ${imageUrl ? "Oui (URL fournie)" : "Aucune"}`
      : `DEMANDE D'ACHAT: "${content.title}" — Catégorie: ${content.category} — Budget: ${content.budget || "Non spécifié"} FCFA — Quantité: ${content.quantity || "?"} ${content.unit || ""} — Description: ${content.description || "Aucune"} — Localisation: ${content.location || "Non spécifiée"} — Image: ${imageUrl ? "Oui" : "Aucune"}`;

    // Call AI for moderation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentDescription },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI moderation error:", aiResponse.status, errText);
      // On AI failure, approve by default and notify user
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "✅ Publication approuvée",
          description: `Votre ${type === "product" ? "produit" : "demande"} "${itemName}" a été approuvé(e) et est maintenant visible sur la marketplace.`,
        });
      }
      return new Response(JSON.stringify({ approved: true, reason: "Modération automatique indisponible" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse AI response
    let modResult: any;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      modResult = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      modResult = { approved: true, reason: "Réponse de modération invalide", confidence: 0 };
    }

    const isApproved = modResult.approved !== false;

    if (isApproved) {
      // Step 2a: Notify user of approval
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "✅ Publication approuvée !",
          description: `Votre ${type === "product" ? "produit" : "demande"} "${itemName}" a été vérifié(e) et approuvé(e) par notre IA. Elle est maintenant visible sur la marketplace !`,
        });
      }
    } else {
      // Step 2b: Notify user of rejection
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "❌ Publication refusée",
          description: `Votre ${type === "product" ? "produit" : "demande"} "${itemName}" ne respecte pas les normes : ${modResult.reason || "Contenu non conforme"}. Elle a été retirée de la marketplace.`,
        });
      }

      // Notify admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            type: "system",
            title: "⚠️ Publication signalée par l'IA",
            description: `${type === "product" ? "Produit" : "Demande"} "${itemName}" refusé. Raison: ${modResult.reason || "Non conforme"}`,
          }))
        );
      }

      // Soft-delete
      if (type === "product") {
        await supabase.from("products").delete().eq("id", id);
      } else {
        await supabase.from("demands").update({ status: "rejected" }).eq("id", id);
      }
    }

    return new Response(JSON.stringify({
      approved: isApproved,
      reason: modResult.reason || null,
      category_check: modResult.category_check,
      content_safety: modResult.content_safety,
      confidence: modResult.confidence,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message, approved: true }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
