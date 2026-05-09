import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { amount, currency, description, return_url, metadata, customer } =
      body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Montant invalide" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const MONEROO_SECRET_KEY = Deno.env.get("MONEROO_SECRET_KEY");
    if (!MONEROO_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Clé Moneroo non configurée" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const monerooPayload = {
      amount: Math.round(amount),
      currency: currency || "XOF",
      description: description || "Paiement NUKUCONNECT",
      return_url:
        return_url || "https://nukuconnect.com/payment-callback",
      customer: {
        email: customer?.email || user.email || "",
        first_name: customer?.first_name || "",
        last_name: customer?.last_name || "",
        phone: customer?.phone || "",
      },
      metadata: metadata || {},
    };

    const monerooRes = await fetch(
      "https://api.moneroo.io/v1/payments/initialize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${MONEROO_SECRET_KEY}`,
        },
        body: JSON.stringify(monerooPayload),
      }
    );

    const monerooData = await monerooRes.json();

    if (!monerooRes.ok || !monerooData?.data?.checkout_url) {
      console.error("Moneroo init error:", JSON.stringify(monerooData));
      return new Response(
        JSON.stringify({
          error:
            monerooData?.message ||
            "Impossible d'initialiser le paiement Moneroo",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    await admin.from("moneroo_transactions").upsert({
      user_id: user.id,
      payment_id: monerooData.data.id,
      status: "initiated",
      amount: Math.round(amount),
      currency: currency || "XOF",
      context: metadata?.context || "direct",
      context_data: metadata || {},
      checkout_url: monerooData.data.checkout_url,
      description: description || "Paiement NUKUCONNECT",
      customer_email: customer?.email || user.email || "",
      provider_response: monerooData.data,
    }, { onConflict: "payment_id" });

    return new Response(
      JSON.stringify({
        checkout_url: monerooData.data.checkout_url,
        payment_id: monerooData.data.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("moneroo-init error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erreur serveur" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
