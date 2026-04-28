// Admin user actions: send password reset email, set new password, ban/unban user, update profile
// Requires the caller to be an admin (verified server-side via has_role).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ActionPayload {
  action: "send_password_reset" | "set_password" | "ban" | "unban" | "update_profile" | "resend_confirmation_email" | "send_magic_link";
  target_user_id: string;
  // Optional fields based on action
  new_password?: string;
  ban_duration?: string; // e.g. "8760h" for 1 year, "none" to unban
  redirect_to?: string;
  profile_patch?: {
    full_name?: string;
    location?: string;
    user_type?: string;
    business_name?: string;
    timezone?: string;
    availability_start?: string;
    availability_end?: string;
  };
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing auth" }, 401);
    }

    // Verify caller is admin (using their JWT against the public client)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

    const adminUserId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: adminUserId,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body: ActionPayload = await req.json().catch(() => ({} as any));
    if (!body.action || !body.target_user_id) {
      return json({ error: "action + target_user_id required" }, 400);
    }

    const targetId = body.target_user_id;

    // Audit log helper
    const audit = async (action: string, details: Record<string, unknown> = {}) => {
      try {
        await admin.from("admin_audit_log").insert({
          admin_id: adminUserId,
          target_user_id: targetId,
          action,
          details,
        });
      } catch (e) {
        console.warn("audit log insert failed", e);
      }
    };

    switch (body.action) {
      case "send_password_reset": {
        const { data: targetUser } = await admin.auth.admin.getUserById(targetId);
        if (!targetUser?.user?.email) return json({ error: "User has no email" }, 400);
        const redirectTo = body.redirect_to || `${new URL(req.url).origin.replace("functions", "lovable")}/auth?type=recovery`;
        // Generate magic recovery link
        const { data, error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email: targetUser.user.email,
          options: { redirectTo },
        });
        if (error) return json({ error: error.message }, 400);
        await audit("send_password_reset", { email: targetUser.user.email });
        return json({
          success: true,
          message: "Lien de réinitialisation généré",
          action_link: data?.properties?.action_link,
          email: targetUser.user.email,
        });
      }

      case "set_password": {
        if (!body.new_password || body.new_password.length < 8) {
          return json({ error: "Mot de passe trop court (min 8 caractères)" }, 400);
        }
        const { error } = await admin.auth.admin.updateUserById(targetId, {
          password: body.new_password,
        });
        if (error) return json({ error: error.message }, 400);
        await audit("set_password", { reason: "admin override" });
        return json({ success: true, message: "Mot de passe mis à jour" });
      }

      case "ban": {
        const duration = body.ban_duration || "8760h"; // 1 year default
        const { error } = await admin.auth.admin.updateUserById(targetId, {
          ban_duration: duration,
        } as any);
        if (error) return json({ error: error.message }, 400);
        await audit("ban_user", { duration });
        return json({ success: true, message: `Compte suspendu (${duration})` });
      }

      case "unban": {
        const { error } = await admin.auth.admin.updateUserById(targetId, {
          ban_duration: "none",
        } as any);
        if (error) return json({ error: error.message }, 400);
        await audit("unban_user", {});
        return json({ success: true, message: "Compte réactivé" });
      }

      case "update_profile": {
        const patch = body.profile_patch || {};
        const allowed = ["full_name", "location", "user_type", "business_name", "timezone", "availability_start", "availability_end"];
        const cleaned: Record<string, unknown> = {};
        for (const k of allowed) {
          if (k in patch && (patch as any)[k] !== undefined) cleaned[k] = (patch as any)[k];
        }
        if (Object.keys(cleaned).length === 0 && body.phone === undefined) {
          return json({ error: "Aucun champ à mettre à jour" }, 400);
        }
        if (Object.keys(cleaned).length > 0) {
          const { error } = await admin
            .from("profiles")
            .update(cleaned)
            .eq("user_id", targetId);
          if (error) return json({ error: error.message }, 400);
        }
        if (body.phone !== undefined) {
          const { error } = await admin
            .from("profile_private")
            .upsert({ user_id: targetId, phone: body.phone }, { onConflict: "user_id" });
          if (error) return json({ error: error.message }, 400);
        }
        await audit("update_profile", { patch: cleaned, phone_changed: body.phone !== undefined });
        return json({ success: true, message: "Profil mis à jour" });
      }

      default:
        return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (e: any) {
    console.error("admin-user-actions error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
