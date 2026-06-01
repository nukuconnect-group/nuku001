// Génère titre/description/catégorie/chapitres d'une formation via Google Gemini direct.
// Insère ensuite les modules générés dans formation_modules.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

// Curated Unsplash agriculture covers (no third-party AI image needed for reliability)
const COVER_FALLBACKS = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&fit=crop&q=80",
  "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=675&fit=crop&q=80",
  "https://images.unsplash.com/photo-1592982537447-6f2a6a0c4b8c?w=1200&h=675&fit=crop&q=80",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=675&fit=crop&q=80",
  "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=1200&h=675&fit=crop&q=80",
];

async function geminiCallStructured(prompt: string, systemInstruction: string, schema: any, functionName: string) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY_missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ functionDeclarations: [{ name: functionName, description: "Renvoie la sortie structurée", parameters: schema }] }],
      toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [functionName] } },
      generationConfig: { temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Gemini structured error", res.status, t);
    if (res.status === 429) throw new Error("rate_limited");
    throw new Error(`gemini_failed:${res.status}`);
  }
  const json = await res.json();
  const fc = json?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
  if (!fc?.args) throw new Error("no_structured_output");
  return fc.args;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const {
      formation_id,
      document_text,
      video_urls = [],
      preview_only = false,
      metadata_only = false,
      cover_only = false,
      categories: allowedCategories = [],
      chapters: providedChapters,
      title: coverTitle,
    } = body || {};

    // Mode cover : on renvoie un visuel curé (pas de dépendance Lovable AI)
    if (cover_only) {
      if (!coverTitle || String(coverTitle).trim().length < 3) {
        return new Response(JSON.stringify({ error: "missing_title" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const titleStr = String(coverTitle);
      const hash = Array.from(titleStr).reduce((a, c) => a + c.charCodeAt(0), 0);
      const imageUrl = COVER_FALLBACKS[hash % COVER_FALLBACKS.length];
      return new Response(JSON.stringify({ success: true, image_url: imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode metadata : génère titre/description/catégorie à partir du document
    if (metadata_only) {
      if (!document_text || String(document_text).trim().length < 50) {
        return new Response(JSON.stringify({ error: "missing_document_text" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const sourceText = String(document_text).slice(0, 12000);
      const cats: string[] = Array.isArray(allowedCategories) && allowedCategories.length
        ? allowedCategories
        : ["Agriculture", "Élevage", "Aquaculture", "Aviculture", "Maraîchage", "Agro-business", "Transformation", "Marketing agricole", "Général"];

      try {
        const meta = await geminiCallStructured(
          `Document:\n${sourceText}\n\nGénère les métadonnées de la formation.`,
          "Tu es un expert en formation agricole. À partir d'un document, propose un titre accrocheur (max 80 caractères), une description claire (max 300 caractères) et une catégorie. Réponds en français.",
          {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              category: { type: "string", enum: cats },
            },
            required: ["title", "description", "category"],
          },
          "generate_metadata",
        );
        return new Response(JSON.stringify({ success: true, metadata: meta }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg === "rate_limited") return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw e;
      }
    }

    if (preview_only) {
      if (!document_text || String(document_text).trim().length < 50) {
        return new Response(JSON.stringify({ error: "missing_document_text" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      if (!formation_id) {
        return new Response(JSON.stringify({ error: "missing_formation_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!providedChapters && !document_text && (video_urls?.length ?? 0) === 0) {
        return new Response(JSON.stringify({ error: "missing_content" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    let formationTitle = "Formation";
    if (formation_id) {
      const { data: formation } = await admin.from("formations").select("id,title").eq("id", formation_id).maybeSingle();
      if (!preview_only && !formation) {
        return new Response(JSON.stringify({ error: "formation_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      formationTitle = formation?.title || formationTitle;
    }

    let chapters: Array<{ title: string; description: string; duration_minutes: number }> = [];

    if (Array.isArray(providedChapters) && providedChapters.length > 0) {
      chapters = providedChapters
        .filter((c: any) => c && typeof c.title === "string" && c.title.trim())
        .map((c: any) => ({
          title: String(c.title).slice(0, 200).trim(),
          description: String(c.description || "").slice(0, 1000).trim(),
          duration_minutes: Math.max(1, Math.min(600, Math.round(Number(c.duration_minutes) || 10))),
        }));
    } else if (document_text) {
      const sourceText = String(document_text).slice(0, 18000);
      try {
        const args = await geminiCallStructured(
          `Titre de la formation: "${formationTitle}"\n\nContenu du document à structurer:\n${sourceText}\n\nGénère les chapitres pédagogiques.`,
          "Tu es un pédagogue agricole. À partir d'un document, tu structures une formation claire en 4 à 8 chapitres. Réponds en français, concis et orienté pratique.",
          {
            type: "object",
            properties: {
              chapters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    duration_minutes: { type: "number" },
                  },
                  required: ["title", "description", "duration_minutes"],
                },
              },
            },
            required: ["chapters"],
          },
          "generate_chapters",
        );
        chapters = args.chapters || [];
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg === "rate_limited") return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw e;
      }
    }

    if (preview_only) {
      return new Response(JSON.stringify({ success: true, chapters }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modules: any[] = chapters.map((c, idx) => ({
      formation_id,
      title: c.title,
      description: c.description,
      content_type: "text",
      content_url: null,
      duration_minutes: Math.max(1, Math.round(c.duration_minutes || 10)),
      sort_order: idx,
    }));

    (video_urls as string[]).forEach((url, i) => {
      if (!url?.trim()) return;
      modules.push({
        formation_id,
        title: `Vidéo ${i + 1}`,
        description: "Module vidéo",
        content_type: "video",
        content_url: url.trim(),
        duration_minutes: 10,
        sort_order: modules.length,
      });
    });

    let inserted = 0;
    if (modules.length) {
      const { error: insErr, count } = await admin.from("formation_modules").insert(modules, { count: "exact" });
      if (insErr) throw insErr;
      inserted = count || modules.length;
      await admin.from("formations").update({ modules_count: inserted }).eq("id", formation_id);
    }

    return new Response(JSON.stringify({ success: true, chapters_generated: chapters.length, modules_inserted: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-formation-modules error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
