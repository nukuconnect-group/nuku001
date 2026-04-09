import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify the user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub;
    const { delivery_id } = await req.json();

    if (!delivery_id || typeof delivery_id !== "string") {
      return new Response(JSON.stringify({ error: "delivery_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the driver profile for this user
    const { data: driverProfile, error: dpError } = await supabase
      .from("driver_profiles")
      .select("id, is_approved, is_available")
      .eq("user_id", userId)
      .single();

    if (dpError || !driverProfile) {
      return new Response(JSON.stringify({ error: "Profil livreur introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!driverProfile.is_approved) {
      return new Response(JSON.stringify({ error: "Compte livreur non approuvé" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!driverProfile.is_available) {
      return new Response(JSON.stringify({ error: "Vous devez être en ligne pour accepter" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Atomically claim the delivery (only if still pending and unclaimed)
    const { data: updated, error: updateError } = await supabase
      .from("deliveries")
      .update({
        driver_id: driverProfile.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", delivery_id)
      .eq("status", "pending")
      .is("driver_id", null)
      .select("id, order_id")
      .single();

    if (updateError || !updated) {
      return new Response(JSON.stringify({ error: "Mission déjà prise ou indisponible" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Notify the buyer
    if (updated.order_id) {
      const { data: order } = await supabase.from("orders").select("buyer_id").eq("id", updated.order_id).maybeSingle();
      if (order) {
        const { data: buyerProfile } = await supabase.from("profiles").select("user_id").eq("id", order.buyer_id).maybeSingle();
        if (buyerProfile) {
          await supabase.from("notifications").insert({
            user_id: buyerProfile.user_id,
            type: "delivery",
            title: "🚚 Livreur assigné !",
            description: `Un livreur a accepté votre commande #${updated.order_id.slice(0, 8)}. Vous pouvez suivre la livraison en temps réel.`,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, delivery_id: updated.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("accept-delivery error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
