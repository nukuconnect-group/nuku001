// Send KYC decision email — admin-triggered.
// Looks up the user's email via service role (auth.admin) and forwards
// to the standard send-transactional-email pipeline so the email goes
// through the durable queue + suppression checks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  user_id: string;
  kyc_id: string;
  kyc_type: "driver" | "supplier";
  decision: "approved" | "rejected";
  admin_note?: string;
  name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin (uses caller JWT)
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: hasRole } = await admin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    } as any);
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body.user_id || !body.kyc_id || !body.decision || !body.kyc_type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the target user's email
    const { data: targetUser, error: userErr } = await admin.auth.admin.getUserById(body.user_id);
    if (userErr || !targetUser?.user?.email) {
      console.error("Cannot fetch target user email:", userErr);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = targetUser.user.email;
    // Smart redirect: /mon-compte sends approved users to their dashboard
    // and pending/rejected ones to the right KYC screen.
    const loginUrl = "https://nukuconnect.com/mon-compte";

    // Forward to send-transactional-email with idempotency to prevent dupes
    const idempotencyKey = `kyc-${body.kyc_id}-${body.decision}`;
    const { data: sendData, error: sendErr } = await admin.functions.invoke(
      "send-transactional-email",
      {
        body: {
          templateName: "kyc-status",
          recipientEmail,
          idempotencyKey,
          templateData: {
            name: body.name || targetUser.user.user_metadata?.full_name || "",
            decision: body.decision,
            kycType: body.kyc_type,
            adminNote: body.admin_note || "",
            loginUrl,
          },
        },
      },
    );

    if (sendErr) {
      console.error("send-transactional-email failed:", sendErr);
      return new Response(JSON.stringify({ error: sendErr.message, details: sendData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Append to KYC audit journal (admin + decision + reason + timestamp)
    await admin.from("kyc_audit_log").insert({
      kyc_id: body.kyc_id,
      kyc_type: body.kyc_type,
      user_id: body.user_id,
      admin_id: caller.id,
      decision: body.decision,
      reason: body.admin_note || null,
      email_idempotency_key: idempotencyKey,
    });

    return new Response(JSON.stringify({ success: true, recipientEmail, idempotencyKey }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-kyc-status-email error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
