import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYGATE_API_KEY = "5dc35b39-431a-4f14-b61e-f28190174385";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, tx_reference } = await req.json();

    if (!identifier && !tx_reference) {
      return new Response(JSON.stringify({ error: "identifier or tx_reference required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = new URLSearchParams();
    body.append("auth_token", PAYGATE_API_KEY);
    if (tx_reference) {
      body.append("tx_reference", tx_reference);
    }
    if (identifier) {
      body.append("identifier", identifier);
    }

    const resp = await fetch("https://paygateglobal.com/api/v1/status", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await resp.json();

    // PayGate status codes: 0 = success/completed, 2 = pending, 4 = expired, 6 = failed
    let status = "unknown";
    if (data.status === 0) status = "completed";
    else if (data.status === 2) status = "pending";
    else if (data.status === 4) status = "expired";
    else if (data.status === 6) status = "failed";

    return new Response(JSON.stringify({
      status,
      raw_status: data.status,
      tx_reference: data.tx_reference,
      amount: data.amount,
      payment_reference: data.payment_reference,
      payment_method: data.payment_method,
      datetime: data.datetime,
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
