import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    // Parse and validate input
    const body = await req.json();
    const { amount, operator, phone_number } = body;

    // Validate amount
    const numAmount = Number(amount);
    if (!numAmount || !Number.isFinite(numAmount) || numAmount < 500 || numAmount > 5000000) {
      return new Response(JSON.stringify({ error: "Montant invalide. Min: 500 FCFA, Max: 5 000 000 FCFA" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate operator
    const validOperators = ["flooz", "tmoney", "wave"];
    if (!operator || !validOperators.includes(operator)) {
      return new Response(JSON.stringify({ error: "Opérateur invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate phone number (8-15 digits)
    const phoneClean = String(phone_number || "").replace(/\s+/g, "");
    if (!/^\d{8,15}$/.test(phoneClean)) {
      return new Response(JSON.stringify({ error: "Numéro de téléphone invalide (8-15 chiffres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for balance checks and insertion
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profil introuvable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate available balance
    const { data: orderData } = await adminClient
      .from("orders")
      .select("total_price, status")
      .eq("seller_id", profile.id);

    const totalEarnings = (orderData || [])
      .filter((o: any) => o.status === "completed" || o.status === "delivered")
      .reduce((sum: number, o: any) => sum + (Number(o.total_price) || 0), 0);

    const { data: wData } = await adminClient
      .from("withdrawals")
      .select("amount, status")
      .eq("user_id", userId);

    const totalWithdrawn = (wData || [])
      .filter((w: any) => w.status !== "rejected")
      .reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0);

    const availableBalance = totalEarnings - totalWithdrawn;

    if (numAmount > availableBalance) {
      return new Response(JSON.stringify({ error: "Solde insuffisant. Disponible: " + availableBalance + " FCFA" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 3 pending withdrawals
    const pendingCount = (wData || []).filter((w: any) => w.status === "pending").length;
    if (pendingCount >= 3) {
      return new Response(JSON.stringify({ error: "Vous avez déjà 3 demandes en attente. Patientez leur traitement." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert withdrawal via service role
    const { data: withdrawal, error: insertError } = await adminClient
      .from("withdrawals")
      .insert({
        user_id: userId,
        profile_id: profile.id,
        amount: numAmount,
        operator,
        phone_number: phoneClean,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Erreur lors de la création: " + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, withdrawal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
