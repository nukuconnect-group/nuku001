import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  formation_id: z.string().uuid(),
  // optional: path of a specific document/module file inside the bucket
  object_path: z.string().min(1).max(500).optional(),
  expires_in: z.number().int().min(30).max(3600).optional().default(300),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Paramètres invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { formation_id, object_path, expires_in } = parsed.data;

    // Authorization check via SECURITY DEFINER helper that uses auth.uid() of the JWT
    const { data: allowedRow, error: authErr } = await userClient.rpc("can_access_formation_document", {
      p_formation_id: formation_id,
    });
    if (authErr) {
      return new Response(JSON.stringify({ error: authErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allowed = allowedRow === true;
    if (!allowed) {
      return new Response(JSON.stringify({
        error: "Accès refusé : vous devez être inscrit à cette formation pour consulter le document.",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve the object path to sign
    let pathToSign = object_path;
    if (!pathToSign) {
      const { data: f, error: fErr } = await admin
        .from("formations")
        .select("source_document_url, source_document_name")
        .eq("id", formation_id)
        .single();
      if (fErr || !f?.source_document_url) {
        return new Response(JSON.stringify({ error: "Aucun document associé à cette formation." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Extract bucket-relative path from a public URL if needed
      const url = String(f.source_document_url);
      const marker = "/storage/v1/object/public/formation-documents/";
      const idx = url.indexOf(marker);
      pathToSign = idx >= 0 ? url.slice(idx + marker.length) : url;
    }

    const { data: signed, error: signErr } = await admin
      .storage.from("formation-documents")
      .createSignedUrl(pathToSign, expires_in);
    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: signErr?.message || "Impossible de générer le lien." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      url: signed.signedUrl,
      expires_in,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[formation-document-url] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
