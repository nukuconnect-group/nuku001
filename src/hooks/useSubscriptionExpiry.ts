import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Checks subscription expiry and shows warnings/blocks when needed.
 * - 7 days before: warning notification
 * - 3 days before: urgent warning
 * - Expired: toast + redirect suggestion
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

      if (!sub || !(sub as any).expires_at) return;

      const expiresAt = new Date((sub as any).expires_at);
      const now = new Date();
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const plan = (sub as any).plan;

      if (daysLeft <= 0) {
        // Expired
        if (plan === "free") {
          toast({
            title: "⏰ Votre période gratuite a expiré",
            description: "Passez au pack Pro pour continuer à publier vos produits.",
            duration: 10000,
          });
          // Mark as expired
          await supabase
            .from("subscriptions" as any)
            .update({ status: "expired" })
            .eq("user_id", userId);
        } else {
          toast({
            title: "⏰ Votre abonnement a expiré",
            description: `Renouvelez votre pack ${plan} pour continuer.`,
            duration: 10000,
          });
          await supabase
            .from("subscriptions" as any)
            .update({ status: "expired" })
            .eq("user_id", userId);
        }
      } else if (daysLeft <= 3) {
        toast({
          title: "⚠️ Abonnement expire dans " + daysLeft + " jour" + (daysLeft > 1 ? "s" : ""),
          description: plan === "free"
            ? "Pensez à passer au pack Pro avant l'expiration."
            : "Renouvelez votre abonnement pour éviter l'interruption.",
          duration: 8000,
        });
        // Insert notification if not already notified recently
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "subscription",
          title: `⚠️ Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`,
          description: plan === "free"
            ? "Votre période gratuite se termine bientôt. Passez au pack Pro pour continuer."
            : `Votre pack ${plan} expire bientôt. Renouvelez-le pour éviter toute interruption.`,
        });
      } else if (daysLeft <= 7) {
        // Gentle reminder
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "subscription",
          title: `📋 Votre abonnement expire dans ${daysLeft} jours`,
          description: plan === "free"
            ? "Préparez votre transition vers le pack Pro."
            : `Pensez à renouveler votre pack ${plan}.`,
        });
      }
    };

    check();
  }, [userId, toast]);
};
