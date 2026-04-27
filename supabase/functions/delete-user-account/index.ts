// Edge function: Fully delete a user account (data + auth user)
// - Self-delete: any authenticated user can delete their own account
// - Admin-delete: admins can delete any account by passing target_user_id
// After deletion, the email is freed and the user can re-register
// (and will receive a new confirmation email).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client bound to caller (to identify them via JWT)
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const targetId: string = body?.target_user_id || callerId;

    // Service-role client for privileged ops
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // If deleting another user, check admin role
    if (targetId !== callerId) {
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        return new Response(
          JSON.stringify({ error: "Forbidden: admin only" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // 1) Cleanup app data (idempotent — uses existing RPC if present)
    // We call via service role (bypasses the has_role check by using a direct
    // delete fallback if RPC fails for self-delete).
    if (targetId !== callerId) {
      // admin path — RPC has its own admin check via auth.uid; call as caller
      const { error: rpcErr } = await userClient.rpc(
        "admin_delete_user_data",
        { p_user_id: targetId },
      );
      if (rpcErr) {
        console.error("RPC admin_delete_user_data error:", rpcErr);
      }
    } else {
      // self-delete: do best-effort cleanup with service role
      const tables: Array<{ table: string; column: string }> = [
        { table: "products", column: "producer_id_via_profile" }, // handled below
      ];
      // Best-effort direct deletes (FK cascades on auth.users will cover the rest)
      try {
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("user_id", targetId)
          .maybeSingle();
        if (profile?.id) {
          await admin.from("products").delete().eq("producer_id", profile.id);
          await admin.from("orders").delete().eq("buyer_id", profile.id);
          await admin
            .from("follows")
            .delete()
            .or(`follower_id.eq.${profile.id},following_id.eq.${profile.id}`);
        }
        await admin.from("demands").delete().eq("user_id", targetId);
        await admin.from("notifications").delete().eq("user_id", targetId);
        await admin.from("wishlist").delete().eq("user_id", targetId);
        await admin.from("subscriptions").delete().eq("user_id", targetId);
        await admin.from("reviews").delete().eq("user_id", targetId);
        await admin.from("driver_profiles").delete().eq("user_id", targetId);
        await admin.from("delivery_addresses").delete().eq("user_id", targetId);
        await admin.from("profile_private").delete().eq("user_id", targetId);
        await admin.from("user_roles").delete().eq("user_id", targetId);
        await admin.from("profiles").delete().eq("user_id", targetId);
      } catch (e) {
        console.error("Self-delete cleanup error (non-fatal):", e);
      }
    }

    // 2) Delete the auth user (frees the email for re-registration)
    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      console.error("auth.admin.deleteUser error:", delErr);
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-user-account fatal:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
