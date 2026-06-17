import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const DEBUG = (Deno.env.get("DEBUG_EDGE") ?? "") === "1";
function dbg(...args: unknown[]) {
  if (DEBUG) console.log("[update-subscription]", ...args);
}

const VALID_PLANS: Record<string, { maxProducts: number; monthlyPrice: number; annualPrice: number }> = {
  free: { maxProducts: 5, monthlyPrice: 0, annualPrice: 0 },
  starter: { maxProducts: 15, monthlyPrice: 2500, annualPrice: 2500 },
  standard: { maxProducts: 30, monthlyPrice: 5000, annualPrice: 5000 },
  premium: { maxProducts: 9999, monthlyPrice: 10000, annualPrice: 10000 },
  pro: { maxProducts: 15, monthlyPrice: 5000, annualPrice: 50000 },
  business: { maxProducts: 9999, monthlyPrice: 15000, annualPrice: 150000 },
  enterprise: { maxProducts: 9999, monthlyPrice: 50000, annualPrice: 500000 },
};

const PAYMENT_VALIDITY_WINDOW_MS = 30 * 60 * 1000;

const BodySchema = z.object({
  plan: z.enum(["free", "starter", "standard", "premium", "pro", "business", "enterprise"]),
  billing_period: z.enum(["monthly", "annual"]),
  payment_identifier: z.string().min(1).max(255).optional(),
  payment_tx_reference: z.string().min(1).max(255).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    dbg("auth header present:", !!authHeader, "starts with Bearer:", authHeader?.startsWith("Bearer "));
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé", reason: "missing_bearer" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey);

    let userId: string | undefined;
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsData?.claims?.sub) {
      userId = claimsData.claims.sub;
    } else {
      // Fallback: validate by hitting auth.getUser with the bearer token
      dbg("getClaims failed, falling back to getUser", claimsError?.message);
      const tokenClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userError } = await tokenClient.auth.getUser(token);
      if (userError || !userData?.user?.id) {
        dbg("getUser failed", userError?.message);
        return new Response(
          JSON.stringify({ error: "Non autorisé", reason: "invalid_token", debug: DEBUG ? (claimsError?.message ?? userError?.message) : undefined }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      userId = userData.user.id;
    }
    dbg("userId resolved:", userId);

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

    // New rules:
    // - Free plan: NO expiration. Anyone can switch to/keep free; becoming supplier is unconditional.
    // - Paid plans: valid 12 months from activation, regardless of billing_period.
    let expiresAt: Date | null;
    if (plan === "free") {
      expiresAt = null;
    } else {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingSubscription } = await adminClient
      .from("subscriptions")
      .select("plan, status, expires_at, started_at")
      .eq("user_id", userId)
      .maybeSingle();

    // No blocking on "free plan already consumed" — buyers can always become suppliers on free.
    // Only prevent paying twice for the same active paid plan.
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
          expires_at: expiresAt ? expiresAt.toISOString() : null,
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
        const idempotencyKey = `subscription-${userId}-${plan}-${(expiresAt ?? now).toISOString().slice(0, 10)}`;
        adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "subscription",
            recipientEmail,
            idempotencyKey,
            templateData: {
              recipientName,
              plan,
              billingPeriod: billing_period,
              expiresAt: expiresAt ? expiresAt.toISOString() : null,
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
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[update-subscription] internal error", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne", debug: DEBUG ? String((error as Error)?.message ?? error) : undefined }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
