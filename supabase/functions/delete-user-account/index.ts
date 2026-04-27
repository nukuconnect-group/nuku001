// Edge function: Fully delete a user account (data + products + auth user)
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

    // Resolve user's profile id (used to delete profile-keyed data)
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", targetId)
      .maybeSingle();
    const profileId: string | null = profile?.id ?? null;

    const safeDelete = async (label: string, fn: () => Promise<any>) => {
      try {
        const { error } = await fn();
        if (error) console.warn(`[delete-user] ${label}:`, error.message);
      } catch (e) {
        console.warn(`[delete-user] ${label} threw:`, (e as Error).message);
      }
    };

    // Exhaustive cleanup with service role (order matters: children → parents)
    if (profileId) {
      // Products & related (products belong to producers via profile id)
      const { data: ownedProducts } = await admin
        .from("products")
        .select("id")
        .eq("producer_id", profileId);
      const productIds = (ownedProducts || []).map((p: any) => p.id);
      if (productIds.length) {
        await safeDelete("product_boosts", () =>
          admin.from("product_boosts").delete().in("product_id", productIds));
        await safeDelete("reviews(by product)", () =>
          admin.from("reviews").delete().in("product_id", productIds));
        await safeDelete("wishlist(by product)", () =>
          admin.from("wishlist").delete().in("product_id", productIds));
      }
      await safeDelete("products", () =>
        admin.from("products").delete().eq("producer_id", profileId));

      // Conversations / messages where user is a party
      const { data: convs } = await admin
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${profileId},seller_id.eq.${profileId}`);
      const convIds = (convs || []).map((c: any) => c.id);
      if (convIds.length) {
        await safeDelete("messages", () =>
          admin.from("messages").delete().in("conversation_id", convIds));
        await safeDelete("conversations", () =>
          admin.from("conversations").delete().in("id", convIds));
      }

      // Orders + deliveries
      const { data: ordersAsBuyer } = await admin
        .from("orders").select("id").eq("buyer_id", profileId);
      const { data: ordersAsSeller } = await admin
        .from("orders").select("id").eq("seller_id", profileId);
      const orderIds = [
        ...(ordersAsBuyer || []),
        ...(ordersAsSeller || []),
      ].map((o: any) => o.id);
      if (orderIds.length) {
        await safeDelete("deliveries", () =>
          admin.from("deliveries").delete().in("order_id", orderIds));
        await safeDelete("orders", () =>
          admin.from("orders").delete().in("id", orderIds));
      }

      await safeDelete("follows", () =>
        admin.from("follows").delete().or(
          `follower_id.eq.${profileId},following_id.eq.${profileId}`,
        ));
      await safeDelete("reviews(by user)", () =>
        admin.from("reviews").delete().eq("user_id", targetId));
    }

    // User-keyed data
    await safeDelete("demands", () =>
      admin.from("demands").delete().eq("user_id", targetId));
    await safeDelete("notifications", () =>
      admin.from("notifications").delete().eq("user_id", targetId));
    await safeDelete("wishlist", () =>
      admin.from("wishlist").delete().eq("user_id", targetId));
    await safeDelete("subscriptions", () =>
      admin.from("subscriptions").delete().eq("user_id", targetId));
    await safeDelete("token_transactions", () =>
      admin.from("token_transactions").delete().eq("user_id", targetId));
    await safeDelete("token_purchases", () =>
      admin.from("token_purchases").delete().eq("user_id", targetId));
    await safeDelete("driver_profiles", () =>
      admin.from("driver_profiles").delete().eq("user_id", targetId));
    await safeDelete("delivery_addresses", () =>
      admin.from("delivery_addresses").delete().eq("user_id", targetId));
    await safeDelete("profile_private", () =>
      admin.from("profile_private").delete().eq("user_id", targetId));
    await safeDelete("user_presence", () =>
      admin.from("user_presence").delete().eq("user_id", targetId));
    await safeDelete("user_roles", () =>
      admin.from("user_roles").delete().eq("user_id", targetId));
    await safeDelete("referrals(referrer)", () =>
      admin.from("referrals").delete().eq("referrer_id", targetId));
    await safeDelete("referrals(referred)", () =>
      admin.from("referrals").delete().eq("referred_user_id", targetId));
    await safeDelete("referral_earnings", () =>
      admin.from("referral_earnings").delete().eq("referrer_id", targetId));

    // Finally remove the profile itself
    await safeDelete("profiles", () =>
      admin.from("profiles").delete().eq("user_id", targetId));

    // Delete the auth user (frees the email for re-registration)
    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      console.error("auth.admin.deleteUser error:", delErr);
      return new Response(
        JSON.stringify({
          error: delErr.message,
          hint: "Some related data could not be removed; check edge logs.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, target_user_id: targetId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
