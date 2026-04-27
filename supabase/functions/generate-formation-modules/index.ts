// Génère automatiquement les chapitres/modules d'une formation à partir d'un texte source (PDF/DOCX extrait côté client) et d'URLs vidéo optionnelles.
// Insère ensuite les modules générés dans formation_modules.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

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

    const { formation_id, document_text, video_urls = [] } = await req.json();
    if (!formation_id || (!document_text && video_urls.length === 0)) {
      return new Response(JSON.stringify({ error: "missing formation_id or content" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify formation ownership via user_id on profile (optional simple check)
    const { data: formation } = await admin.from("formations").select("id,title").eq("id", formation_id).maybeSingle();
    if (!formation) {
      return new Response(JSON.stringify({ error: "formation not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Truncate doc text to avoid huge prompts
    const sourceText = (document_text || "").slice(0, 18000);

    // Ask the AI for a structured outline (tool calling)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu es un pédagogue agricole. À partir d'un document, tu structures une formation claire en 4 à 8 chapitres. Réponds en français, concis et orienté pratique." },
          { role: "user", content: `Titre de la formation: "${formation.title}"\n\nContenu du document à structurer:\n${sourceText}\n\nGénère les chapitres pédagogiques.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_chapters",
            description: "Renvoie une liste ordonnée de chapitres pour la formation",
            parameters: {
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
                    additionalProperties: false,
                  },
                },
              },
              required: ["chapters"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_chapters" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "credits_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`ai_failed:${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { chapters: [] };
    const chapters: Array<{ title: string; description: string; duration_minutes: number }> = args.chapters || [];

    // Build modules: AI text chapters first, then video URLs as separate modules
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
