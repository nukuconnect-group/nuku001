import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Notifications informatives sur l'état des packs.
 * Les jetons sont valables 12 mois : tant qu'un solde actif existe,
 * on n'affiche pas d'alerte de réabonnement liée à un pack premium.
 * Le plan gratuit dure 30 jours et peut être renouvelé 2 fois (3 mois max).
 */
export const useSubscriptionExpiry = (userId?: string) => {
  const { toast } = useToast();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userId || checkedRef.current) return;
    checkedRef.current = true;

    const check = async () => {
      const [{ data: sub }, { data: tokenBalance }] = await Promise.all([
        supabase
          .from("subscriptions" as any)
          .select("plan, status, expires_at, free_renewals_used")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.rpc("get_user_token_balance", { p_user_id: userId }),
      ]);

      if (!sub) return;
      const balance = typeof tokenBalance === "number" ? tokenBalance : 0;
      const plan = (sub as any).plan;
      const expiresAt = (sub as any).expires_at ? new Date((sub as any).expires_at) : null;

      // Plan gratuit : durée 30 jours + 2 renouvellements, géré par la bannière dédiée.
      if (plan === "free") {
        return;
      }

      // Si des jetons actifs existent, ne pas envoyer d'alerte de réabonnement.
      if (balance > 0) return;

      // Plans payants : alerte seulement quand aucun jeton actif n'est disponible.
      if (expiresAt) {
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) {
          toast({
            title: "💡 Jetons à recharger",
            description: `Votre pack ${plan} est terminé et aucun jeton actif n'est disponible. Rechargez uniquement si vous voulez continuer à booster.`,
            duration: 8000,
          });
        } else if (daysLeft <= 3) {
          toast({
            title: `⏳ Pack ${plan} bientôt terminé`,
            description: "Aucun jeton actif détecté. Rechargez seulement si vous voulez continuer à utiliser les boosts.",
            duration: 6000,
          });
        }
      }
    };

    check();
  }, [userId, toast]);
};
