import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Notifications informatives sur les jetons et abonnements payants uniquement.
 *
 * Règles produit :
 *  - Aucun compte n'expire automatiquement. L'accès reste ouvert même sans jetons.
 *  - Le plan gratuit n'a PAS d'échéance — aucune alerte d'expiration n'est émise.
 *  - Seuls les abonnements payants arrivant réellement à échéance déclenchent
 *    un rappel discret pour proposer un renouvellement.
 *  - Le solde de jetons (valables 12 mois) déclenche un rappel de recharge
 *    quand il atteint zéro, sans bloquer le compte.
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
          .select("plan, status, expires_at")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.rpc("get_user_token_balance", { p_user_id: userId }),
      ]);

      const balance = typeof tokenBalance === "number" ? tokenBalance : 0;
      const plan = (sub as any)?.plan;
      const expiresAt = (sub as any)?.expires_at ? new Date((sub as any).expires_at) : null;

      // Plan gratuit : aucune alerte d'expiration (pas d'échéance).
      // Solde à zéro : invitation discrète à recharger.
      if (!plan || plan === "free") {
        if (balance === 0) {
          toast({
            title: "💡 Rechargez vos jetons",
            description:
              "Votre solde de jetons est à 0. Votre compte reste actif — rechargez quand vous voulez pour booster vos produits.",
            duration: 6000,
          });
        }
        return;
      }

      const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      // Abonnement payant qui arrive réellement à échéance.
      if (daysLeft !== null && daysLeft <= 7) {
        if (daysLeft <= 0) {
          toast({
            title: `⏳ Abonnement ${plan} terminé`,
            description:
              "Votre compte reste accessible. Renouvelez votre pack pour conserver les avantages premium.",
            duration: 8000,
          });
        } else {
          toast({
            title: `⏳ Pack ${plan} se termine dans ${daysLeft}j`,
            description:
              "Pensez à renouveler pour garder vos avantages premium actifs. Votre compte ne sera pas désactivé.",
            duration: 6000,
          });
        }
        return;
      }

      // Solde jetons à zéro pendant un pack payant actif : rappel de recharge uniquement.
      if (balance === 0) {
        toast({
          title: "💡 Rechargez vos jetons",
          description:
            "Solde de jetons à 0. Votre pack reste actif jusqu'à son échéance — rechargez pour continuer à booster vos produits.",
          duration: 6000,
        });
      }
    };

    check();
  }, [userId, toast]);
};
