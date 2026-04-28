// Edge function: SEO AI assistant
// - action "autofill": generates title/description/keywords/canonical from a route
// - action "generate_og": generates a 1200x630 OG image and uploads it to seo-og-images bucket
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(authHeader: string | null) {
  if (!authHeader) throw new Error("missing_auth");
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supa.auth.getUser();
  if (!userData?.user) throw new Error("not_authenticated");
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roles) throw new Error("forbidden");
  return { user: userData.user, admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user, admin } = await requireAdmin(req.headers.get("Authorization"));
    const { action, route, context } = await req.json();

    if (!action || !route) return jsonResponse({ error: "missing action or route" }, 400);

    const niceName = route === "__global__"
      ? "NUKUCONNECT"
      : route.replace(/^\//, "").replace(/-/g, " ").trim() || "Accueil";

    if (action === "autofill") {
      const prompt = `Tu es expert SEO francophone pour NUKUCONNECT, marketplace agricole intelligente d'Afrique.
Page: "${niceName}" (route: ${route}).
${context ? `Contexte: ${context}` : ""}
Génère des métadonnées SEO optimisées en français. Réponds UNIQUEMENT en JSON valide:
{"title":"max 55 caractères, accrocheur","description":"max 155 caractères, claire avec call-to-action","keywords":"5-8 mots-clés séparés par virgules","canonical_path":"${route === "__global__" ? "/" : route}"}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiResp.ok) {
        const t = await aiResp.text();
        if (aiResp.status === 429) return jsonResponse({ error: "Limite atteinte, réessayez plus tard." }, 429);
        if (aiResp.status === 402) return jsonResponse({ error: "Crédits IA épuisés." }, 402);
        return jsonResponse({ error: "AI error", details: t }, 500);
      }
      const data = await aiResp.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(text); } catch { parsed = {}; }
      return jsonResponse({ success: true, data: parsed });
    }

    if (action === "generate_og") {
      const imgPrompt = `Crée une image Open Graph professionnelle 1200x630 pour la marketplace agricole africaine NUKUCONNECT.
Page: "${niceName}". ${context ? `Contexte: ${context}` : ""}
Style: moderne, vert et bleu (palette agri-tech), photo réaliste d'agriculture africaine,
texte minimaliste avec le titre "${niceName.toUpperCase()}", logo discret, composition équilibrée pour partage social.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: imgPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!aiResp.ok) {
        const t = await aiResp.text();
        if (aiResp.status === 429) return jsonResponse({ error: "Limite atteinte, réessayez plus tard." }, 429);
        if (aiResp.status === 402) return jsonResponse({ error: "Crédits IA épuisés." }, 402);
        return jsonResponse({ error: "AI image error", details: t }, 500);
      }
      const data = await aiResp.json();
      const dataUrl: string | undefined = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl?.startsWith("data:")) return jsonResponse({ error: "no image returned" }, 500);

      const [meta, b64] = dataUrl.split(",");
      const mime = meta.match(/data:([^;]+);base64/)?.[1] || "image/png";
      const ext = mime.includes("jpeg") ? "jpg" : "png";
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

      const safeRoute = route.replace(/[^a-zA-Z0-9_-]/g, "_") || "global";
      const path = `${safeRoute}-${Date.now()}.${ext}`;

      const { error: upErr } = await admin.storage
        .from("seo-og-images")
        .upload(path, bytes, { contentType: mime, upsert: true });
      if (upErr) return jsonResponse({ error: "upload failed", details: upErr.message }, 500);

      const { data: pub } = admin.storage.from("seo-og-images").getPublicUrl(path);

      // Persist directly into seo_settings for this route
      await admin.from("seo_settings").update({ og_image_url: pub.publicUrl }).eq("route", route);

      return jsonResponse({ success: true, og_image_url: pub.publicUrl });
    }

    return jsonResponse({ error: "unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    const status = msg === "forbidden" ? 403 : msg.includes("auth") ? 401 : 500;
    return jsonResponse({ error: msg }, status);
  }
});
