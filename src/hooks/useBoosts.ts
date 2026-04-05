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

/** Returns only product IDs that are currently boosted (no financial data exposed) */
export const useActiveBoosts = () => {
  return useQuery({
    queryKey: ["active-boosts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_boosted_product_ids" as any);
      if (error) throw error;
      return (data || []) as { product_id: string }[];
    },
    staleTime: 1000 * 60 * 2,
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

export const isProductBoosted = (boosts: { product_id: string }[], productId: string): boolean => {
  return boosts.some(b => b.product_id === productId);
};

export const getBoostPlan = (boosts: ProductBoost[], productId: string): string | null => {
  const now = new Date();
  const boost = boosts.find(b => b.product_id === productId && b.is_active && new Date(b.expires_at) > now);
  return boost?.plan_name || null;
};
