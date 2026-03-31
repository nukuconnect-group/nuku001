import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYGATE_API_KEY = "5dc35b39-431a-4f14-b61e-f28190174385";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description, identifier, phone_number, network } = await req.json();

    if (!amount || !identifier) {
      return new Response(JSON.stringify({ error: "amount and identifier required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PayGate Global API v1 - initiate transaction
    const body = new URLSearchParams();
    body.append("auth_token", PAYGATE_API_KEY);
    body.append("phone_number", phone_number || "");
    body.append("amount", String(amount));
    body.append("description", description || "Paiement NUKUCONNECT");
    body.append("identifier", identifier);
    body.append("network", network || "");

    const resp = await fetch("https://paygateglobal.com/api/v1/pay", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await resp.json();

    // Also try v2 hosted page as fallback
    if (data.status !== 0) {
      const v2Body = new URLSearchParams();
      v2Body.append("auth_token", PAYGATE_API_KEY);
      v2Body.append("amount", String(amount));
      v2Body.append("description", description || "Paiement NUKUCONNECT");
      v2Body.append("identifier", identifier);

      const v2Resp = await fetch("https://paygateglobal.com/api/v2/page", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: v2Body.toString(),
      });

      const v2Data = await v2Resp.json();
      
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
      ...data,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
