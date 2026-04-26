import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Notifications informatives sur l'état de l'abonnement.
 * IMPORTANT — Politique non-bloquante :
 *   - Aucun compte n'est jamais désactivé.
 *   - Les produits restent visibles, peu importe le plan.
 *   - Le plan gratuit est valable indéfiniment ; on rappelle juste l'option premium.
 *   - Les packs payants : on rappelle de recharger ses crédits si épuisés.
 */
export const useSubscriptionExpiry = (userId?: string) => {
  const { toast } = useToast();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userId || checkedRef.current) return;
    checkedRef.current = true;

    const check = async () => {
      const { data: sub } = await supabase
        .from("subscriptions" as any)
        .select("plan, status, expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!sub) return;
      const plan = (sub as any).plan;
      const expiresAt = (sub as any).expires_at ? new Date((sub as any).expires_at) : null;

      // Plan gratuit : juste un rappel doux pour devenir premium (jamais bloquant, jamais d'expiration)
      if (plan === "free") {
        // Pas de toast forcé, l'UI affiche déjà la carte quota avec CTA "Devenir premium".
        return;
      }

      // Plans payants : si expiration proche, suggérer une recharge (jamais bloquant)
      if (expiresAt) {
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) {
          toast({
            title: "💡 Pensez à recharger vos crédits",
            description: `Votre pack ${plan} a atteint son terme. Vos produits restent en ligne — rechargez pour continuer à booster.`,
            duration: 8000,
          });
        } else if (daysLeft <= 3) {
          toast({
            title: `⏳ Votre pack ${plan} arrive à terme dans ${daysLeft}j`,
            description: "Vos produits restent visibles. Rechargez vos crédits pour conserver les avantages.",
            duration: 6000,
          });
        }
      }
    };

    check();
  }, [userId, toast]);
};
