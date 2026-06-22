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

    // Moneroo only accepts scalar metadata values (string|number|boolean)
    // AND limits metadata to 10 items max. We flatten + cap to 9 essential keys.
    const rawMeta = (metadata && typeof metadata === "object") ? metadata : {};
    const flatMetadata: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(rawMeta)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "number") {
        flatMetadata[k] = Number.isInteger(v) ? v : String(v);
      } else if (typeof v === "string" || typeof v === "boolean") {
        flatMetadata[k] = v;
      } else {
        try { flatMetadata[k] = JSON.stringify(v); } catch { /* skip */ }
      }
    }
    // Priority keys kept first; everything else is stored only in our DB (context_data).
    const PRIORITY_KEYS = [
      "context", "order_id", "user_id", "plan_id", "plan", "formation_id",
      "tokens", "items_count", "cart_id"
    ];
    const cappedMetadata: Record<string, string | number | boolean> = {};
    for (const k of PRIORITY_KEYS) {
      if (k in flatMetadata && Object.keys(cappedMetadata).length < 9) {
        cappedMetadata[k] = flatMetadata[k];
      }
    }
    for (const [k, v] of Object.entries(flatMetadata)) {
      if (Object.keys(cappedMetadata).length >= 9) break;
      if (!(k in cappedMetadata)) cappedMetadata[k] = v;
    }

    const monerooPayload = {
      amount: Math.round(amount),
      currency: currency || "XOF",
      description: description || "Paiement NUKUCONNECT",
      return_url:
        return_url || "https://nukuconnect.com/payment-callback",
      customer: (() => {
        const email = String(customer?.email || user.email || "");
        const rawFirst = String(customer?.first_name || "").trim();
        const rawLast = String(customer?.last_name || "").trim();
        const emailLocal = email.split("@")[0] || "Client";
        const parts = (user.user_metadata?.full_name || "").trim().split(/\s+/).filter(Boolean);
        const first_name = rawFirst || parts[0] || emailLocal || "Client";
        const last_name = rawLast || parts.slice(1).join(" ") || parts[0] || "Nukuconnect";
        return {
          email,
          first_name: String(first_name),
          last_name: String(last_name),
          phone: String(customer?.phone || user.user_metadata?.phone || ""),
        };
      })(),
      metadata: cappedMetadata,
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
