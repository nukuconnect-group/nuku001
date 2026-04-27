import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Notifications informatives sur l'état des packs.
 * Les jetons sont valables 12 mois : tant qu'un solde actif existe,
 * on n'affiche pas d'alerte de réabonnement liée à un pack premium.
 * Le plan gratuit dure 30 jours et peut être renouvelé 2 fois (3 mois max).
 *
 * Messages clarifiés :
 *  - "✅ Jetons actifs détectés" — informe que le compte reste utilisable.
 *  - "⚠️ Aucun jeton disponible" — propose la prochaine action (recharger).
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

      const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      // Si des jetons actifs existent, message rassurant clair (une seule fois par session).
      if (balance > 0) {
        if (daysLeft !== null && daysLeft <= 7) {
          toast({
            title: "✅ Jetons actifs détectés",
            description: `Vous disposez de ${balance} jeton${balance > 1 ? "s" : ""} valide${balance > 1 ? "s" : ""} 12 mois. Aucune action requise — votre compte reste pleinement actif.`,
            duration: 6000,
          });
        }
        return;
      }

      // Plans payants sans jetons : message d'action explicite.
      if (daysLeft !== null) {
        if (daysLeft <= 0) {
          toast({
            title: "⚠️ Aucun jeton disponible",
            description: `Votre pack ${plan} est terminé et votre solde de jetons est vide. Prochaine action : rechargez des jetons pour continuer à booster vos produits.`,
            duration: 8000,
          });
        } else if (daysLeft <= 3) {
          toast({
            title: `⏳ Pack ${plan} se termine dans ${daysLeft}j`,
            description: "Aucun jeton disponible. Prochaine action : rechargez avant l'échéance pour conserver vos boosts actifs.",
            duration: 6000,
          });
        }
      }
    };

    check();
  }, [userId, toast]);
};
