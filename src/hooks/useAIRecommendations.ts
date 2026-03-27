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
      const { data, error } = await supabase.functions.invoke("ai-recommendations", {
        body: { user_id: userId, role, profile_id: profileId, location },
      });
      if (error) throw error;
      return data as { recommendations: BuyerRecommendations | SupplierRecommendations; context: any };
    },
    enabled: !!userId && !!profileId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}

export type { BuyerRecommendations, SupplierRecommendations };
