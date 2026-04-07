import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  amount: z.number().positive().max(50_000_000),
  description: z.string().max(500).optional().default("Paiement NUKUCONNECT"),
  identifier: z.string().min(1).max(255),
  phone_number: z.string().max(20).optional(),
  network: z.enum(["FLOOZ", "TMONEY", "CARD"]).optional(),
  use_redirect: z.boolean().optional(),
});

// Strip phone to digits only, remove leading 228 country code
const cleanPhoneNumber = (phone?: string): string => {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  return digits.startsWith("228") && digits.length > 8 ? digits.slice(3) : digits;
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
    const PAYGATE_API_KEY = Deno.env.get("PAYGATE_API_KEY") || "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
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
    const { amount, description, identifier, phone_number: rawPhone, network, use_redirect } = parsed.data;
    const phone_number = cleanPhoneNumber(rawPhone);

    const isCard = use_redirect || !network || network === "CARD";

    if (isCard) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const callbackUrl = `${supabaseUrl}/functions/v1/paygate-webhook`;

      const v2Body = new URLSearchParams();
      v2Body.append("auth_token", PAYGATE_API_KEY);
      v2Body.append("amount", String(amount));
      v2Body.append("description", description);
      v2Body.append("identifier", identifier);
      v2Body.append("callback_url", callbackUrl);

      const v2Resp = await fetch("https://paygateglobal.com/api/v2/page", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: v2Body.toString(),
      });

      const v2Text = await v2Resp.text();
      let v2Data: any;
      try {
        v2Data = JSON.parse(v2Text);
      } catch {
        return new Response(JSON.stringify({
          success: false,
          mode: "redirect",
          error: "Le paiement par carte n'est pas disponible actuellement. Utilisez Mobile Money.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (v2Data.status === 0 && v2Data.token) {
        return new Response(JSON.stringify({
          success: true,
          mode: "redirect",
          payment_url: `https://paygateglobal.com/v2/page/${v2Data.token}`,
          token: v2Data.token,
          tx_reference: v2Data.tx_reference,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: false,
        mode: "redirect",
        error: "Impossible d'initialiser le paiement par carte. Réessayez.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mobile Money
    const body = new URLSearchParams();
    body.append("auth_token", PAYGATE_API_KEY);
    body.append("phone_number", phone_number || "");
    body.append("amount", String(amount));
    body.append("description", description);
    body.append("identifier", identifier);
    body.append("network", network!);

    const resp = await fetch("https://paygateglobal.com/api/v1/pay", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const respText = await resp.text();
    let data: any;
    try {
      data = JSON.parse(respText);
    } catch {
      data = { status: -1 };
    }

    if (data.status !== 0) {
      const v2Body = new URLSearchParams();
      v2Body.append("auth_token", PAYGATE_API_KEY);
      v2Body.append("amount", String(amount));
      v2Body.append("description", description);
      v2Body.append("identifier", identifier);

      const v2Resp = await fetch("https://paygateglobal.com/api/v2/page", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: v2Body.toString(),
      });

      const v2Text = await v2Resp.text();
      let v2Data: any;
      try { v2Data = JSON.parse(v2Text); } catch { v2Data = {}; }

      if (v2Data.status === 0 && v2Data.token) {
        return new Response(JSON.stringify({
          success: true,
          mode: "redirect",
          payment_url: `https://paygateglobal.com/v2/page/${v2Data.token}`,
          token: v2Data.token,
          tx_reference: v2Data.tx_reference,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      success: data.status === 0,
      mode: "direct",
      tx_reference: data.tx_reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
