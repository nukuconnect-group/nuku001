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

type RecoPayload = { recommendations: BuyerRecommendations | SupplierRecommendations; context: any };

const cacheKey = (role: string, userId?: string) => `nuku-ai-reco:${role}:${userId || "anon"}`;

/** Lecture instantanée du dernier résultat connu (affichage immédiat, sans attendre l'IA). */
function readCache(role: string, userId?: string): RecoPayload | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(role, userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // Expiration douce : 24h
    if (!parsed?.at || Date.now() - parsed.at > 24 * 60 * 60 * 1000) return undefined;
    return parsed.data as RecoPayload;
  } catch {
    return undefined;
  }
}

function writeCache(role: string, userId: string | undefined, data: RecoPayload) {
  try {
    localStorage.setItem(cacheKey(role, userId), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota — ignore */
  }
}

export function useAIRecommendations(role: "buyer" | "producer", userId?: string, profileId?: string, location?: string) {
  const cached = readCache(role, userId);

  return useQuery({
    queryKey: ["ai-recommendations", role, userId],
    initialData: cached,
    // Le cache local sert d'affichage instantané, mais on rafraîchit en arrière-plan.
    initialDataUpdatedAt: cached ? 0 : undefined,
    refetchOnMount: "always",
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
