import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logClientDiag } from "@/lib/clientDiagnostics";

export interface PriceTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price: number;
  sort_order: number;
}

interface UseProductPriceTiersOptions {
  realtime?: boolean;
}

export type RealtimeStatus = "disabled" | "connecting" | "connected" | "error";

// Statut Realtime exposé pour la page admin de diagnostic (sans hook supplémentaire).
const realtimeStatusMap = new Map<string, RealtimeStatus>();
export function getRealtimeStatusSnapshot() {
  return Array.from(realtimeStatusMap.entries()).map(([productId, status]) => ({ productId, status }));
}

const isMobile = () =>
  typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const useProductPriceTiers = (productId?: string, options: UseProductPriceTiersOptions = {}) => {
  const queryClient = useQueryClient();
  const realtimeEnabled = options.realtime === true;
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(
    realtimeEnabled ? "connecting" : "disabled",
  );

  useEffect(() => {
    if (!productId) return;
    if (!realtimeEnabled) {
      realtimeStatusMap.set(productId, "disabled");
      return;
    }

    const channel = supabase.channel(`price-tiers-${productId}-${crypto.randomUUID()}`);
    realtimeStatusMap.set(productId, "connecting");
    setRealtimeStatus("connecting");

    try {
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "product_price_tiers", filter: `product_id=eq.${productId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["price-tiers", productId] });
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            realtimeStatusMap.set(productId, "connected");
            setRealtimeStatus("connected");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            realtimeStatusMap.set(productId, "error");
            setRealtimeStatus("error");
            logClientDiag("realtime", `price-tiers ${status}`, {
              level: "warn",
              meta: { productId, status, mobile: isMobile() },
            });
            // Fallback REST : on rafraîchit la query manuellement (déjà polled via staleTime).
            queryClient.invalidateQueries({ queryKey: ["price-tiers", productId] });
          }
        });
    } catch (error) {
      realtimeStatusMap.set(productId, "error");
      setRealtimeStatus("error");
      logClientDiag("realtime", "price-tiers subscribe threw", {
        level: "error",
        meta: { productId, err: String(error) },
      });
      void supabase.removeChannel(channel);
      return;
    }

    return () => {
      realtimeStatusMap.delete(productId);
      void supabase.removeChannel(channel);
    };
  }, [productId, queryClient, realtimeEnabled]);

  const query = useQuery({
    queryKey: ["price-tiers", productId],
    enabled: !!productId,
    // Retry ciblé : 3 essais sur mobile, 1 sinon, backoff exponentiel borné à 4 s.
    retry: isMobile() ? 3 : 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    queryFn: async (): Promise<PriceTier[]> => {
      const { data, error } = await supabase
        .from("product_price_tiers" as any)
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true });
      if (error) {
        logClientDiag("price-tiers", "REST fetch failed", {
          level: "error",
          meta: { productId, err: error.message },
        });
        throw error;
      }
      return (data || []) as any as PriceTier[];
    },
    staleTime: 1000 * 60 * 2,
  });

  return Object.assign(query, { realtimeStatus });
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
