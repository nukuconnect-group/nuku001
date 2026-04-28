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
  identifier: z.string().min(1).max(255),
  tx_reference: z.string().optional(),
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
    const PAYGATE_API_KEY = Deno.env.get("PAYGATE_API_KEY") || "";

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
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { formation_id, identifier, tx_reference } = parsed.data;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the formation is paid
    const { data: formation, error: fErr } = await admin
      .from("formations")
      .select("id, is_paid, price, title")
      .eq("id", formation_id)
      .single();
    if (fErr || !formation) {
      return new Response(JSON.stringify({ error: "Formation introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!formation.is_paid) {
      return new Response(JSON.stringify({ error: "Cette formation est gratuite, inscription directe possible." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if already enrolled, return success
    const { data: existing } = await admin
      .from("formation_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("formation_id", formation_id)
      .is("module_id", null)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, already_enrolled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment via Paygate
    const params = new URLSearchParams();
    params.append("auth_token", PAYGATE_API_KEY);
    if (tx_reference) params.append("tx_reference", tx_reference);
    else params.append("identifier", identifier);

    const payResp = await fetch("https://paygateglobal.com/api/v1/status", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const payData = await payResp.json().catch(() => ({}));

    // Paygate status: 0 = success/paid
    const isPaid = payData?.status === 0 || payData?.status === "0";
    if (!isPaid) {
      return new Response(JSON.stringify({
        success: false,
        error: "Paiement non confirmé",
        paygate_status: payData?.status,
        paygate: payData,
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Enroll
    const { error: insErr } = await admin.from("formation_progress").insert({
      user_id: userId,
      formation_id,
      module_id: null,
      completed: false,
      progress_percent: 0,
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notification
    await admin.from("notifications").insert({
      user_id: userId,
      type: "formation",
      title: "Inscription confirmée",
      description: `Vous avez accès à la formation : ${formation.title}`,
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ success: true, enrolled: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[enroll-paid-formation] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
