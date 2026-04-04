import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  amount: z.number().positive().min(500, "Min: 500 FCFA").max(5_000_000, "Max: 5 000 000 FCFA"),
  operator: z.enum(["flooz", "tmoney", "wave"]),
  phone_number: z.string().regex(/^\d{8,15}$/, "Numéro de téléphone invalide (8-15 chiffres)"),
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { amount, operator, phone_number } = parsed.data;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

    if (amount > availableBalance) {
      return new Response(JSON.stringify({ error: "Solde insuffisant. Disponible: " + availableBalance + " FCFA" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pendingCount = (wData || []).filter((w: any) => w.status === "pending").length;
    if (pendingCount >= 3) {
      return new Response(JSON.stringify({ error: "Vous avez déjà 3 demandes en attente. Patientez leur traitement." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: withdrawal, error: insertError } = await adminClient
      .from("withdrawals")
      .insert({
        user_id: userId,
        profile_id: profile.id,
        amount,
        operator,
        phone_number,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Erreur lors de la création" }), {
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
