import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  type: z.enum(["product", "demand"]),
  id: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceCall = token === SUPABASE_SERVICE_ROLE_KEY;

    let callerUserId = "";
    if (!isServiceCall) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerUserId = claimsData.claims.sub as string;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { type, id } = parsed.data;

    // Helper: send a transactional email about product moderation result
    const sendModerationEmail = async (
      userIdToNotify: string,
      productName: string,
      status: "approved" | "rejected",
      reason?: string,
    ) => {
      if (!userIdToNotify) return;
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userIdToNotify);
        const recipientEmail = userData?.user?.email;
        if (!recipientEmail) return;
        const recipientName =
          (userData?.user?.user_metadata as any)?.full_name ||
          (userData?.user?.user_metadata as any)?.name ||
          undefined;
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "product-moderation",
            recipientEmail,
            idempotencyKey: `product-mod:${id}:${status}`,
            templateData: {
              recipientName,
              productName,
              status,
              reason: reason || undefined,
              productUrl: "https://www.nukuconnect.com/dashboard",
            },
          },
        });
      } catch (e) {
        console.warn("Failed to send moderation email:", e);
      }
    };

    let content: any = null;
    let userId: string = "";
    let imageUrl: string | null = null;
    let itemName: string = "";
    let alreadyModerated: "approved" | "rejected" | null = null;

    if (type === "product") {
      const { data } = await supabase.from("products").select("*, profiles!products_producer_id_fkey(user_id, full_name)").eq("id", id).single();
      if (!data) throw new Error("Product not found");
      content = data;
      userId = data.profiles?.user_id || "";
      imageUrl = data.images?.[0] || null;
      itemName = data.name;
      if (data.moderation_status === "approved" || data.moderation_status === "rejected") {
        alreadyModerated = data.moderation_status;
      }
    } else {
      const { data } = await supabase.from("demands").select("*").eq("id", id).single();
      if (!data) throw new Error("Demand not found");
      content = data;
      userId = data.user_id;
      imageUrl = data.image_url || null;
      itemName = data.title;
      if (data.status === "rejected" || data.status === "active") {
        // demands: 'active' acts as approved here — skip re-notification
        alreadyModerated = data.status === "rejected" ? "rejected" : "approved";
      }
    }

    // Idempotence: if the item has already been moderated, do NOT re-run AI,
    // do NOT re-send notifications or emails. Simply return the existing decision.
    if (alreadyModerated) {
      return new Response(JSON.stringify({
        approved: alreadyModerated === "approved",
        already_moderated: true,
        reason: content?.moderation_reason || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller owns the content (or is admin) — service calls bypass ownership
    if (!isServiceCall) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerUserId, _role: "admin" });
      if (!isAdmin && userId !== callerUserId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Note: skip the "verification in progress" notification — the user was already informed at submission.

    const systemPrompt = `Tu es un modérateur de contenu pour NukuConnect, une marketplace dédiée au SECTEUR AGRICOLE AU SENS LARGE en Afrique.

✅ AUTORISÉ (à accepter sans hésiter) — tout ce qui touche au secteur agricole et à son écosystème :
- Cultures vivrières et de rente (céréales, légumes, fruits, tubercules, café, cacao, coton, etc.)
- Élevage (bovins, ovins, caprins, volailles, lapins, porcs, aliments pour bétail)
- Pêche & AQUACULTURE (poissons vivants, alevins, aliments aquacoles, AQUARIUMS, bassins, cages flottantes, équipement piscicole, pompes, aérateurs, filtres)
- Apiculture (ruches, miel, cire, équipement)
- Horticulture, floriculture, pépinières, semences, plants, bulbes
- Sylviculture, agroforesterie, plants forestiers
- Agroalimentaire transformé (farines, jus, conserves, fromages, huiles végétales, transformation)
- Intrants agricoles (engrais, semences, pesticides bio/conventionnels, substrats, terreau)
- Matériel et équipement agricole (tracteurs, charrues, motoculteurs, irrigation, serres, outils, emballages, bâches, sacs jute)
- Services agricoles (consulting, mécanisation, location matériel, transport agricole)
- Énergie/automatisation agricole (panneaux solaires pour ferme, pompes solaires, capteurs IoT agricoles)

❌ INTERDIT (à refuser systématiquement) — produits hors secteur agricole :
- BTP & construction générale (ciment, fer à béton, briques, peinture maison)
- Mode, textile non-agricole, cosmétiques, parfums
- Électronique grand public (smartphones, TV, ordinateurs hors usage agricole)
- Automobile non-agricole (voitures de tourisme, motos urbaines)
- Mobilier domestique, électroménager non-agricole
- Formations (gérées dans un module séparé), services financiers, immobilier
- Contenu illégal : nudité, sexuel, violence, armes, drogues, contrefaçon
- Spam, escroqueries, prix incohérents/dérisoires sans justification

RÈGLE D'OR : en cas de doute sur l'appartenance au secteur agricole/aquacole, ACCEPTE le contenu (false negative = perte de vendeur ; on préfère un faux positif modéré ensuite par l'admin). Un AQUARIUM est TOUJOURS accepté (aquaculture).

Réponds UNIQUEMENT avec un JSON valide (pas de markdown):
{
  "approved": true/false,
  "reason": "Raison si refusé (en français, max 200 caractères) — cite la règle ❌ violée, ou explique clairement que l'image ne correspond pas au titre (ex: 'Titre indique maïs mais l'image montre du riz — corrigez le titre ou l'image')",
  "category_check": "agricultural/non-agricultural/suspicious",
  "content_safety": "safe/unsafe",
  "image_title_match": "match/mismatch/unknown",
  "confidence": 0.0-1.0
}

IMPORTANT — Cohérence image/titre : si une image est fournie, VÉRIFIE qu'elle correspond bien au titre et à la catégorie. Si le titre dit « maïs » mais que l'image montre autre chose (riz, tomate, sac vide, etc.), REFUSE avec image_title_match="mismatch" et explique à l'utilisateur ce qu'il doit corriger.`;

    const contentDescription = type === "product"
      ? `PRODUIT: "${content.name}" — Catégorie: ${content.category} — Prix: ${content.price} FCFA/${content.unit} — Description: ${content.description || "Aucune"} — Localisation: ${content.location || "Non spécifiée"}`
      : `DEMANDE D'ACHAT: "${content.title}" — Catégorie: ${content.category} — Budget: ${content.budget || "Non spécifié"} FCFA — Quantité: ${content.quantity || "?"} ${content.unit || ""} — Description: ${content.description || "Aucune"} — Localisation: ${content.location || "Non spécifiée"}`;

    // Build multimodal user content : texte + image (si dispo) pour la vérification visuelle
    const userContent: any[] = [{ type: "text", text: contentDescription }];
    if (imageUrl) {
      userContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Vision-capable model pour analyser l'image en plus du texte
        model: imageUrl ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI moderation error:", aiResponse.status, errText);
      // On AI failure, approve by default to avoid blocking suppliers
      if (type === "product") {
        await supabase.from("products").update({
          moderation_status: "approved",
          moderated_at: new Date().toISOString(),
          moderation_reason: "Modération automatique indisponible — approbation par défaut",
        }).eq("id", id);
      }
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "✅ Publication approuvée",
          description: `Votre ${type === "product" ? "produit" : "demande"} "${itemName}" a été approuvé(e).`,
        });
      }
      if (type === "product") {
        await sendModerationEmail(userId, itemName, "approved");
      }
      return new Response(JSON.stringify({ approved: true, reason: "Modération automatique indisponible" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
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
      if (type === "product") {
        await supabase.from("products").update({
          moderation_status: "approved",
          moderated_at: new Date().toISOString(),
          moderation_reason: modResult.reason || null,
        }).eq("id", id);
      }
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "✅ Publication approuvée !",
          description: `Votre ${type === "product" ? "produit" : "demande"} "${itemName}" a été vérifié(e) et est maintenant visible sur la marketplace.`,
        });
      }
      if (type === "product") {
        await sendModerationEmail(userId, itemName, "approved");
      }
    } else {
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "❌ Publication refusée",
          description: `Votre ${type === "product" ? "produit" : "demande"} "${itemName}" ne respecte pas les normes : ${modResult.reason || "Contenu non conforme"}.`,
        });
      }

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

      if (type === "product") {
        await supabase.from("products").update({
          moderation_status: "rejected",
          moderated_at: new Date().toISOString(),
          moderation_reason: modResult.reason || "Non conforme",
        }).eq("id", id);
      } else {
        await supabase.from("demands").update({ status: "rejected" }).eq("id", id);
      }
      if (type === "product") {
        await sendModerationEmail(userId, itemName, "rejected", modResult.reason);
      }
    }

    // Append a moderation log entry (for products only — table has product_id FK)
    if (type === "product") {
      try {
        await supabase.from("moderation_logs").insert({
          product_id: id,
          decision: isApproved ? "approved" : "rejected",
          reason: modResult.reason || null,
          category_check: modResult.category_check || null,
          content_safety: modResult.content_safety || null,
          confidence: modResult.confidence ?? null,
          raw_response: aiData,
          prompt_summary: contentDescription.slice(0, 500),
        });
      } catch (e) {
        console.warn("Failed to write moderation log:", e);
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
    return new Response(JSON.stringify({ error: "Erreur interne", approved: true }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
