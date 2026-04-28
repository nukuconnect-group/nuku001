import { supabase } from "@/integrations/supabase/client";

export type MembershipPlanId = "free" | "pro" | "business" | "enterprise";
export type MembershipBilling = "monthly" | "annual";

const PLAN_LABELS: Record<MembershipPlanId, string> = {
  free: "Gratuit",
  pro: "Pro",
  business: "Business",
  enterprise: "Entreprise",
};

const NEXT_PLAN_LABELS: Partial<Record<MembershipPlanId, string>> = {
  free: "Pro",
  pro: "Business",
  business: "Entreprise",
};

const PLAN_ADVANTAGES: Record<MembershipPlanId, string> = {
  free: "publier jusqu'à 3 produits, démarrer vos ventes et utiliser la messagerie de base",
  pro: "publier jusqu'à 15 produits, afficher votre badge vérifié et accéder aux statistiques de ventes",
  business: "publier sans limite, booster vos offres et piloter votre activité avec des outils avancés",
  enterprise: "bénéficier d'un accompagnement dédié et d'une solution complète pour une grande structure",
};

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildCelebration(planId: MembershipPlanId, maxProducts: number) {
  const label = PLAN_LABELS[planId];
  const nextPlan = NEXT_PLAN_LABELS[planId];
  const title = `🎉 Félicitations pour votre pack ${label}`;
  const description = nextPlan
    ? `Votre compte profite maintenant des avantages du pack ${label}. Continuez à vendre et passez bientôt au pack ${nextPlan} pour aller encore plus loin.`
    : `Votre compte profite maintenant des avantages du pack ${label}. Toute l'expérience vendeur avancée est activée.`;

  const message = [
    `${title} !`,
    "",
    `Votre compte vendeur est maintenant activé avec le pack **${label}**.`,
    `Vous pouvez désormais **${PLAN_ADVANTAGES[planId]}**.`,
    maxProducts >= 9999
      ? "Votre quota de publication est **illimité**."
      : `Votre quota actuel est de **${maxProducts} produit${maxProducts > 1 ? "s" : ""}**.`,
    nextPlan
      ? `💡 Quand vous serez prêt, passez au pack **${nextPlan}** pour débloquer encore plus d'avantages.`
      : "🚀 Vous êtes sur une formule avancée conçue pour accélérer vos ventes.",
  ].join("\n");

  return { title, description, message };
}

async function ensureSystemConversation(profileId: string) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("buyer_id", profileId)
    .eq("seller_id", profileId)
    .is("product_id", null)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      buyer_id: profileId,
      seller_id: profileId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}

interface ActivateMembershipParams {
  userId: string;
  profileId: string;
  planId: MembershipPlanId;
  billing: MembershipBilling;
  maxProducts: number;
  promoteToProducer?: boolean;
  fullName?: string;
  location?: string;
  bio?: string;
  phone?: string;
  paymentProof?: {
    identifier?: string;
    tx_reference?: string;
  };
}

export async function activateMembership({
  userId,
  profileId,
  planId,
  billing,
  maxProducts,
  promoteToProducer = false,
  fullName,
  location,
  bio,
  phone,
  paymentProof,
}: ActivateMembershipParams) {
  if (planId !== "free" && !paymentProof?.identifier && !paymentProof?.tx_reference) {
    throw new Error("Le paiement doit être confirmé depuis la page Tarifs pour activer un pack payant.");
  }

  const profileUpdates: Record<string, string> = {};

  if (typeof fullName === "string") profileUpdates.full_name = fullName;
  if (typeof location === "string") profileUpdates.location = location;
  if (typeof bio === "string") profileUpdates.bio = bio;
  if (promoteToProducer) profileUpdates.user_type = "producer";

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabase.from("profiles").update(profileUpdates).eq("id", profileId);
    if (error) throw error;
  }

  if (typeof phone === "string" && phone.trim()) {
    const { error } = await supabase
      .from("profile_private")
      .upsert({ user_id: userId, phone: phone.trim() }, { onConflict: "user_id" });
    if (error) throw error;
  }

  let { data: { session } } = await supabase.auth.getSession();
  // Force a refresh to ensure the access token isn't expired/stale
  if (session?.refresh_token) {
    const { data: refreshed } = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
    if (refreshed?.session) session = refreshed.session;
  }
  if (!session?.access_token) {
    throw new Error("Session expirée. Veuillez vous reconnecter pour finaliser votre abonnement.");
  }

  const { data: subData, error: subscriptionError } = await supabase.functions.invoke(
    "update-subscription",
    {
      body: {
        plan: planId,
        billing_period: billing,
        payment_identifier: paymentProof?.identifier,
        payment_tx_reference: paymentProof?.tx_reference,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (subscriptionError) throw subscriptionError;
  if (subData?.error) throw new Error(subData.error);

  const celebration = buildCelebration(planId, maxProducts);

  const notificationPromise = supabase.from("notifications").insert({
    user_id: userId,
    type: "subscription",
    title: celebration.title,
    description: celebration.description,
  });

  const conversationPromise = ensureSystemConversation(profileId)
    .then((conversationId) =>
      supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: profileId,
        content: celebration.message,
      })
    );

  await Promise.allSettled([notificationPromise, conversationPromise]);

  return {
    planLabel: PLAN_LABELS[planId],
    celebration,
  };
}