import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PriceTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price: number;
  sort_order: number;
}

export const useProductPriceTiers = (productId?: string) => {
  const queryClient = useQueryClient();

  // Realtime: invalidate cache on any change to this product's tiers
  useEffect(() => {
    if (!productId) return;
    const channel = supabase
      .channel(`price-tiers-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_price_tiers", filter: `product_id=eq.${productId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["price-tiers", productId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, queryClient]);

  return useQuery({
    queryKey: ["price-tiers", productId],
    enabled: !!productId,
    queryFn: async (): Promise<PriceTier[]> => {
      const { data, error } = await supabase
        .from("product_price_tiers" as any)
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as any as PriceTier[];
    },
    staleTime: 1000 * 60 * 2,
  });
};

/** Returns the best price for a given quantity, or fallback price */
export const getEffectivePrice = (tiers: PriceTier[], quantity: number, fallbackPrice: number): number => {
  if (!tiers || tiers.length === 0) return fallbackPrice;
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  let chosen = fallbackPrice;
  for (const t of sorted) {
    if (quantity >= t.min_quantity && (t.max_quantity == null || quantity <= t.max_quantity)) {
      chosen = t.price;
    }
  }
  return chosen;
};
