import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  conversationId: string;
  preview?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = userData.user.id;

    const body = (await req.json()) as Body;
    if (!body?.conversationId) {
      return new Response(JSON.stringify({ error: "conversationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch conversation
    const { data: conv } = await admin
      .from("conversations")
      .select("id, buyer_id, seller_id, product_id")
      .eq("id", body.conversationId)
      .maybeSingle();
    if (!conv) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve sender profile to know if caller is buyer or seller
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("id, full_name, business_name, user_id")
      .eq("user_id", callerUserId)
      .maybeSingle();
    if (!senderProfile) {
      return new Response(JSON.stringify({ error: "No profile" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipientProfileId: string | null = null;
    if (senderProfile.id === conv.buyer_id) recipientProfileId = conv.seller_id;
    else if (senderProfile.id === conv.seller_id) recipientProfileId = conv.buyer_id;
    else {
      return new Response(JSON.stringify({ error: "Not a participant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient
    const { data: recipientProfile } = await admin
      .from("profiles")
      .select("user_id, full_name, business_name")
      .eq("id", recipientProfileId)
      .maybeSingle();
    if (!recipientProfile) {
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipient email
    const { data: authUser } = await admin.auth.admin.getUserById(recipientProfile.user_id);
    const recipientEmail = authUser?.user?.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional product name
    let productName: string | undefined;
    if (conv.product_id) {
      const { data: product } = await admin
        .from("products")
        .select("name")
        .eq("id", conv.product_id)
        .maybeSingle();
      productName = product?.name;
    }

    const senderName =
      senderProfile.business_name?.trim() ||
      senderProfile.full_name?.trim() ||
      "Un utilisateur";
    const recipientName =
      recipientProfile.business_name?.trim() ||
      recipientProfile.full_name?.trim() ||
      undefined;

    // Throttle: only one email per conversation per 5 minutes
    const idempotencyKey = `new-message-${conv.id}-${Math.floor(Date.now() / (5 * 60 * 1000))}`;

    const { data: invokeRes, error: invokeErr } = await admin.functions.invoke(
      "send-transactional-email",
      {
        body: {
          templateName: "new-message",
          recipientEmail,
          idempotencyKey,
          templateData: {
            recipientName,
            senderName,
            productName,
            preview: (body.preview || "").slice(0, 200),
            conversationUrl: `https://www.nukuconnect.com/messages?c=${conv.id}`,
          },
        },
      },
    );

    if (invokeErr) {
      console.error("Email invoke error", invokeErr);
    }

    return new Response(JSON.stringify({ ok: true, queued: !invokeErr, result: invokeRes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-message-recipient error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
