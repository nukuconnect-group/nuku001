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
        .single();

      if (data && !error) {
        setSubscription(data as any as Subscription);
      }
      setIsLoading(false);
    };

    fetchSubscription();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      fetchSubscription();
    });

    return () => authSub.unsubscribe();
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
      .single();
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
