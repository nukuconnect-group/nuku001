import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PLANS: Record<string, { maxProducts: number; monthlyPrice: number; annualPrice: number }> = {
  free: { maxProducts: 3, monthlyPrice: 0, annualPrice: 0 },
  pro: { maxProducts: 15, monthlyPrice: 5000, annualPrice: 50000 },
  business: { maxProducts: 9999, monthlyPrice: 15000, annualPrice: 150000 },
  enterprise: { maxProducts: 9999, monthlyPrice: 50000, annualPrice: 500000 },
};

const PAYMENT_VALIDITY_WINDOW_MS = 30 * 60 * 1000;

const BodySchema = z.object({
  plan: z.enum(["free", "pro", "business", "enterprise"]),
  billing_period: z.enum(["monthly", "annual"]),
  payment_identifier: z.string().min(1).max(255).optional(),
  payment_tx_reference: z.string().min(1).max(255).optional(),
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

    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
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
    const { plan, billing_period, payment_identifier, payment_tx_reference } = parsed.data;

    const planConfig = VALID_PLANS[plan];
    const expectedAmount = billing_period === "monthly" ? planConfig.monthlyPrice : planConfig.annualPrice;
    const now = new Date();

    // Free plan = 1 month, paid plans = based on billing period
    let expiresAt: Date;
    if (plan === "free") {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
    } else {
      expiresAt = billing_period === "monthly"
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingSubscription } = await adminClient
      .from("subscriptions")
      .select("plan, status, expires_at, started_at")
      .eq("user_id", userId)
      .maybeSingle();

    // Block re-subscribing to free plan if user already had one
    if (plan === "free" && existingSubscription) {
      const hadFreePlan = existingSubscription.plan === "free";
      const isExpired = existingSubscription.expires_at && new Date(existingSubscription.expires_at).getTime() <= now.getTime();
      
      if (hadFreePlan && isExpired) {
        return new Response(JSON.stringify({ 
          error: "Votre période gratuite a expiré. Veuillez passer au pack Pro ou supérieur pour continuer." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If already on active free plan
      if (hadFreePlan && existingSubscription.status === "active" && existingSubscription.expires_at && new Date(existingSubscription.expires_at).getTime() > now.getTime()) {
        return new Response(JSON.stringify({ error: "Vous avez déjà un plan gratuit actif." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If user previously had a paid plan (or expired free), block free re-subscription
      if (!hadFreePlan) {
        return new Response(JSON.stringify({ 
          error: "Le plan gratuit n'est disponible que pour les nouveaux comptes. Veuillez choisir un plan Pro ou supérieur." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (
      plan !== "free" &&
      existingSubscription?.plan === plan &&
      existingSubscription.status === "active" &&
      existingSubscription.expires_at &&
      new Date(existingSubscription.expires_at).getTime() > now.getTime()
    ) {
      return new Response(JSON.stringify({ error: "Ce plan est déjà actif." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (plan !== "free") {
      if (!payment_identifier && !payment_tx_reference) {
        return new Response(JSON.stringify({ error: "Paiement requis pour ce plan." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paygateApiKey = Deno.env.get("PAYGATE_API_KEY") || "";
      if (!paygateApiKey) {
        return new Response(JSON.stringify({ error: "Configuration de paiement indisponible." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusBody = new URLSearchParams();
      statusBody.append("auth_token", paygateApiKey);
      if (payment_identifier) statusBody.append("identifier", payment_identifier);
      if (payment_tx_reference) statusBody.append("tx_reference", payment_tx_reference);

      const statusResponse = await fetch("https://paygateglobal.com/api/v1/status", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: statusBody.toString(),
      });

      const rawStatusPayload = await statusResponse.text();
      let paymentStatus: any;
      try {
        paymentStatus = JSON.parse(rawStatusPayload);
      } catch {
        return new Response(JSON.stringify({ error: "Impossible de vérifier le paiement." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawStatus = typeof paymentStatus.status === "number"
        ? paymentStatus.status
        : Number.parseInt(String(paymentStatus.status ?? "-1"), 10);

      if (rawStatus !== 0) {
        return new Response(JSON.stringify({ error: "Paiement non confirmé." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paidAmount = Number(paymentStatus.amount);
      if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
        return new Response(JSON.stringify({ error: "Le montant du paiement ne correspond pas au plan choisi." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentDate = paymentStatus.datetime ? new Date(paymentStatus.datetime) : null;
      if (!paymentDate || Number.isNaN(paymentDate.getTime()) || now.getTime() - paymentDate.getTime() > PAYMENT_VALIDITY_WINDOW_MS) {
        return new Response(JSON.stringify({ error: "La confirmation du paiement a expiré. Veuillez réessayer." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

    // Send subscription confirmation email (non-blocking, idempotent per activation)
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
      const recipientEmail = authUser?.user?.email;
      if (recipientEmail) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("full_name, business_name")
          .eq("user_id", userId)
          .maybeSingle();
        const recipientName =
          profile?.business_name?.trim() || profile?.full_name?.trim() || undefined;
        const idempotencyKey = `subscription-${userId}-${plan}-${expiresAt.toISOString().slice(0, 10)}`;
        adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "subscription",
            recipientEmail,
            idempotencyKey,
            templateData: {
              recipientName,
              plan,
              billingPeriod: billing_period,
              expiresAt: expiresAt.toISOString(),
              event: "activated",
            },
          },
        }).catch((e) => console.error("subscription email invoke failed", e));
      }
    } catch (e) {
      console.error("subscription email prep failed", e);
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
