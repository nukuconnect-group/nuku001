import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  identifier: z.string().min(1).max(255).optional(),
  tx_reference: z.string().min(1).max(255).optional(),
}).refine(data => data.identifier || data.tx_reference, {
  message: "identifier ou tx_reference requis",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const PAYGATE_API_KEY = Deno.env.get("PAYGATE_API_KEY") || "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { identifier, tx_reference } = parsed.data;

    const body = new URLSearchParams();
    body.append("auth_token", PAYGATE_API_KEY);
    if (tx_reference) body.append("tx_reference", tx_reference);
    if (identifier) body.append("identifier", identifier);

    const resp = await fetch("https://paygateglobal.com/api/v1/status", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const rawText = await resp.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[paygate-status] Non-JSON response:", rawText);
      data = { status: -1 };
    }

    const rawStatus = typeof data.status === "number" ? data.status : parseInt(data.status, 10);
    
    let status = "unknown";
    if (rawStatus === 0) status = "completed";
    else if (rawStatus === 2) status = "pending";
    else if (rawStatus === 4) status = "expired";
    else if (rawStatus === 6) status = "failed";

    return new Response(JSON.stringify({
      status,
      raw_status: rawStatus,
      tx_reference: data.tx_reference,
      amount: data.amount,
      payment_reference: data.payment_reference,
      payment_method: data.payment_method,
      datetime: data.datetime,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[paygate-status] Error:", error.message);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
