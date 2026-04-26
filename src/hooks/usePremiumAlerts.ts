import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Crée des notifications in-app contextuelles :
 *  - Solde de jetons faible (≤ 5)
 *  - Abonnement expirant bientôt (≤ 7 jours)
 *  - Abonnement déjà expiré
 *
 * Déduplication : on stocke en localStorage la dernière clé (jour + type)
 * pour ne pas spammer la même notif plusieurs fois par jour.
 */
export function usePremiumAlerts(userId: string | null | undefined) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userId || checkedRef.current) return;
    checkedRef.current = true;

    const today = new Date().toISOString().slice(0, 10);

    const insertOnce = async (
      key: string,
      payload: { title: string; description: string; type: string }
    ) => {
      const storageKey = `nuku_alert_${key}_${today}`;
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, "1");
      await supabase.from("notifications").insert({
        user_id: userId,
        title: payload.title,
        description: payload.description,
        type: payload.type,
      });
    };

    const run = async () => {
      // Solde jetons
      const { data: balance } = await supabase.rpc("get_user_token_balance", { p_user_id: userId });
      const bal = typeof balance === "number" ? balance : 0;
      if (bal <= 5 && bal > 0) {
        await insertOnce("tokens_low", {
          title: "💰 Solde de jetons faible",
          description: `Il vous reste ${bal} jeton${bal > 1 ? "s" : ""}. Rechargez pour continuer à booster vos produits.`,
          type: "tokens",
        });
      } else if (bal === 0) {
        await insertOnce("tokens_empty", {
          title: "🪙 Solde de jetons épuisé",
          description: "Rechargez vos jetons pour activer la traçabilité et booster vos produits.",
          type: "tokens",
        });
      }

      // Abonnement
      const { data: sub } = await supabase
        .from("subscriptions" as any)
        .select("plan, status, expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (sub) {
        const plan = (sub as any).plan as string;
        const expiresAt = (sub as any).expires_at ? new Date((sub as any).expires_at) : null;
        if (expiresAt && plan !== "free") {
          const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
          if (daysLeft <= 0) {
            await insertOnce("sub_expired", {
              title: `⏰ Abonnement ${plan} expiré`,
              description: "Renouvelez pour conserver vos avantages premium (analytics, API, conseiller IA).",
              type: "subscription",
            });
          } else if (daysLeft <= 7) {
            await insertOnce("sub_expiring", {
              title: `⏳ Abonnement ${plan} expire dans ${daysLeft}j`,
              description: "Pensez au renouvellement pour éviter toute interruption.",
              type: "subscription",
            });
          }
        }
      }
    };

    run().catch(() => {});
  }, [userId]);
}
