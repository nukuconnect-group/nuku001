import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BuyerRecommendations {
  recommended_products: { id: string; reason: string }[];
  similar_products: { id: string; reason: string }[];
  nearby_suppliers: { id: string; reason: string }[];
  recommended_formations: { id: string; reason: string }[];
}

interface SupplierRecommendations {
  potential_clients: { demand_id: string; buyer_name: string; reason: string }[];
  trending_products: { category: string; avg_price: number; demand_count: number; suggestion: string }[];
  ai_suggestions: { type: string; title: string; description: string }[];
}

export function useAIRecommendations(role: "buyer" | "producer", userId?: string, profileId?: string, location?: string) {
  return useQuery({
    queryKey: ["ai-recommendations", role, userId],
    queryFn: async () => {
      const emptyBuyer: BuyerRecommendations = { recommended_products: [], similar_products: [], nearby_suppliers: [], recommended_formations: [] };
      const emptySupplier: SupplierRecommendations = { potential_clients: [], trending_products: [], ai_suggestions: [] };
      const fallback = { recommendations: role === "buyer" ? emptyBuyer : emptySupplier, context: {} };
      try {
        const { data, error } = await supabase.functions.invoke("ai-recommendations", {
          body: { user_id: userId, role, profile_id: profileId, location },
        });
        if (error) {
          console.warn("[ai-recommendations] unavailable, using fallback:", error.message);
          return fallback;
        }
        if (data?.error) {
          console.warn("[ai-recommendations] returned error:", data.error);
          return fallback;
        }
        return data as { recommendations: BuyerRecommendations | SupplierRecommendations; context: any };
      } catch (e) {
        console.warn("[ai-recommendations] exception, using fallback:", e);
        return fallback;
      }
    },
    enabled: !!userId && !!profileId,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 0,
    placeholderData: (prev: any) => prev,
  });
}

export type { BuyerRecommendations, SupplierRecommendations };
