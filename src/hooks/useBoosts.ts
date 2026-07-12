import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductBoost {
  id: string;
  product_id: string;
  user_id: string;
  plan_name: string;
  days: number;
  price: number;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface ActiveBoost {
  product_id: string;
  plan_name?: string;
  priority?: number;
}

/** Returns only product IDs that are currently boosted (no financial data exposed) */
export const useActiveBoosts = () => {
  return useQuery({
    queryKey: ["active-boosts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_boosted_products" as any, { p_limit: 200 });
      if (error) throw error;
      return (data || []) as ActiveBoost[];
    },
    staleTime: 1000 * 60,
  });
};

export const trackBoostEvent = async (
  productId: string,
  eventType: "impression" | "click" | "view" | "contact" | "favorite" | "order" = "impression",
  source = "marketplace",
) => {
  if (!productId) return;
  let sessionKey = "";
  try {
    sessionKey = sessionStorage.getItem("nuku-session-id") || "";
    if (!sessionKey) {
      sessionKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("nuku-session-id", sessionKey);
    }
  } catch {
    sessionKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const dedupeKey = `boost-${eventType}-${source}-${productId}`;
  if (eventType === "impression") {
    try {
      const last = sessionStorage.getItem(dedupeKey);
      if (last && Date.now() - Number(last) < 6 * 60 * 60 * 1000) return;
      sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch {
      // ignore storage failures
    }
  }

  await supabase.rpc("track_boost_event" as any, {
    p_product_id: productId,
    p_event_type: eventType,
    p_source: source,
    p_session_key: sessionKey,
  });
};

/** Returns full boost data for the current user's own product */
export const useProductBoosts = (productId?: string) => {
  return useQuery({
    queryKey: ["product-boosts", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_boosts")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProductBoost[];
    },
    enabled: !!productId,
  });
};

export const isProductBoosted = (boosts: ActiveBoost[] | { product_id: string }[], productId: string): boolean => {
  return boosts.some(b => b.product_id === productId);
};

export const getBoostPlan = (boosts: ProductBoost[], productId: string): string | null => {
  const now = new Date();
  const boost = boosts.find(b => b.product_id === productId && b.is_active && new Date(b.expires_at) > now);
  return boost?.plan_name || null;
};
