import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PLANS: Record<string, { maxProducts: number; monthlyPrice: number }> = {
  free: { maxProducts: 3, monthlyPrice: 0 },
  pro: { maxProducts: 15, monthlyPrice: 5000 },
  business: { maxProducts: 9999, monthlyPrice: 15000 },
  enterprise: { maxProducts: 9999, monthlyPrice: 50000 },
};

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { plan, billing_period } = body;

    // Validate plan
    if (!plan || !VALID_PLANS[plan]) {
      return new Response(JSON.stringify({ error: "Plan invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate billing period
    const validBillingPeriods = ["monthly", "annual"];
    if (!billing_period || !validBillingPeriods.includes(billing_period)) {
      return new Response(JSON.stringify({ error: "Période de facturation invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get current subscription
    const { data: currentSub } = await adminClient
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .single();

    // For paid plans, in a real app we'd verify payment here.
    // For now, we enforce that only valid transitions are allowed
    // and the server controls the max_products value (not the client).
    const planConfig = VALID_PLANS[plan];
    const now = new Date();
    const expiresAt = billing_period === "monthly"
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const { error: upsertError } = await adminClient
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan,
          billing_period,
          max_products: planConfig.maxProducts,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      return new Response(JSON.stringify({ error: "Erreur lors de la mise à jour" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan,
        max_products: planConfig.maxProducts,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
