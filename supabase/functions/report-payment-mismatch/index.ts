import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  identifier: z.string().min(1).max(255).optional(),
  tx_reference: z.string().min(1).max(255).optional(),
  order_id: z.string().uuid().optional(),
  formation_id: z.string().uuid().optional(),
  /** UI-side status the user is seeing when they hit the button */
  observed_state: z.string().min(1).max(50),
  /** Optional note from the user */
  note: z.string().max(1000).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ success: false, error: "Non autorisé" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonRes({ success: false, error: "Non autorisé" }, 401);
    }
    const user = userData.user;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonRes(
        { success: false, error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const { identifier, tx_reference, order_id, formation_id, observed_state, note } = parsed.data;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Best-effort: pull buyer name
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const buyerName = profile?.full_name || user.email || "Utilisateur";

    const subjectBits = [
      observed_state === "debited_pending_finalization"
        ? "Débit confirmé / commande non finalisée"
        : `Statut de paiement à vérifier (${observed_state})`,
      identifier && `id=${identifier}`,
      tx_reference && `tx=${tx_reference}`,
      order_id && `order=${order_id.slice(0, 8)}`,
      formation_id && `formation=${formation_id.slice(0, 8)}`,
    ].filter(Boolean);
    const subject = subjectBits.join(" · ").slice(0, 240);

    const content = [
      `${buyerName} signale un problème de paiement.`,
      `Statut côté UI : ${observed_state}`,
      identifier ? `Identifier Paygate : ${identifier}` : null,
      tx_reference ? `tx_reference : ${tx_reference}` : null,
      order_id ? `Commande : ${order_id}` : null,
      formation_id ? `Formation : ${formation_id}` : null,
      note ? `Message client : ${note}` : null,
      "",
      "⚠️ Ne PAS recharger le client. Vérifier l'état chez Paygate avant toute action.",
    ]
      .filter(Boolean)
      .join("\n");

    // Insert support ticket message — single user-side row creates the ticket via gen_random_uuid()
    const { data: msg, error: msgErr } = await admin
      .from("support_messages")
      .insert({
        user_id: user.id,
        sender_role: "user",
        user_name: buyerName,
        user_email: user.email,
        subject,
        content,
      })
      .select("id, ticket_id")
      .single();

    if (msgErr) {
      console.error("[report-payment-mismatch] insert error", msgErr);
      return jsonRes({ success: false, error: "Impossible d'ouvrir le ticket support." }, 500);
    }

    // Notify all admins
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      const notifs = admins.map((a) => ({
        user_id: a.user_id,
        type: "withdrawal" as const, // reuse existing notification channel
        title: "🔔 Décalage paiement signalé",
        description: `${buyerName} signale ${observed_state === "debited_pending_finalization" ? "un débit non finalisé" : "un statut paiement anormal"}. Ticket #${String(msg.ticket_id).slice(0, 8)}.`,
      }));
      await admin.from("notifications").insert(notifs);
    }

    return jsonRes({
      success: true,
      ticket_id: msg.ticket_id,
      user_message:
        "Votre signalement a été transmis au support NukuConnect. Nous vérifions le débit chez Paygate avant toute action — vous serez recontacté très vite.",
    });
  } catch (e) {
    console.error("[report-payment-mismatch] error", e);
    return jsonRes({ success: false, error: "Erreur serveur." }, 500);
  }
});

function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
