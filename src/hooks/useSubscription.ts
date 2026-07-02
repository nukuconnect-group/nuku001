import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  plan: string;
  max_products: number;
  status: string;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("subscriptions" as any)
        .select("plan, max_products, status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data && !error) {
        setSubscription(data as any as Subscription);
      }
      setIsLoading(false);
    };

    fetchSubscription();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      fetchSubscription();
    });

    // Realtime: instant refresh after admin grant, renewal, or payment
    let realtimeCh: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || cancelled) return;
      try {
        // Unique channel name per hook instance to avoid "cannot add callbacks after subscribe()"
        const chName = `subscription-realtime-${session.user.id}-${Math.random().toString(36).slice(2)}`;
        realtimeCh = supabase
          .channel(chName)
          .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${session.user.id}` },
            () => fetchSubscription())
          .subscribe();
      } catch (e) {
        console.warn("[useSubscription] realtime unavailable:", e);
      }
    });

    return () => {
      authSub.unsubscribe();
      if (realtimeCh) supabase.removeChannel(realtimeCh);
    };
  }, []);

  const hasActiveSubscription = !!subscription && subscription.status === "active";

  const canPublishProduct = async (): Promise<{ allowed: boolean; reason?: string }> => {
    if (!subscription || subscription.status !== "active") {
      return { allowed: false, reason: "no_subscription" };
    }

    if (!userId) return { allowed: false, reason: "not_authenticated" };

    // Check product count for free plan
    if (subscription.plan === "free") {
      const { data } = await supabase.rpc("count_user_products", { p_user_id: userId });
      const count = (data as number) || 0;
      if (count >= subscription.max_products) {
        return { allowed: false, reason: "limit_reached" };
      }
    }

    return { allowed: true };
  };

  const refreshSubscription = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("subscriptions" as any)
      .select("plan, max_products, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setSubscription(data as any as Subscription);
  };

  return {
    subscription,
    isLoading,
    hasActiveSubscription,
    canPublishProduct,
    refreshSubscription,
  };
};
