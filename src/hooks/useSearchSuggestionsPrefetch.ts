import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheSet } from "@/lib/localCache";
import { isAggressivePrefetchAllowed, getConnectionMode } from "@/lib/connectionMode";

const CACHE_KEY = "search-suggestions";
const CACHE_TTL = 1000 * 60 * 30; // 30 min

export interface SearchSuggestionPayload {
  categories: { name: string; count: number }[];
  popularProducts: { id: string; name: string; category: string; image: string | null }[];
}

/**
 * Précharge à la demande (focus / typing) les suggestions :
 * - catégories actives
 * - produits populaires (les plus récents approuvés)
 *
 * Stratégie "safe" :
 * - Ne se déclenche QUE quand l'utilisateur interagit avec le champ (pas au mount)
 * - Une seule fois par session (cache mémoire + cache local 30 min)
 * - Skip si mode "low" (2G / saveData) sauf si l'utilisateur tape réellement
 */
export const useSearchSuggestionsPrefetch = () => {
  const queryClient = useQueryClient();
  const triggeredRef = useRef(false);

  const trigger = (force = false) => {
    if (triggeredRef.current) return;
    const mode = getConnectionMode();
    if (mode === "low" && !force) return;
    if (!isAggressivePrefetchAllowed() && !force && mode !== "mid") return;
    triggeredRef.current = true;

    // Si déjà en cache local frais, on hydrate seulement React Query, pas de réseau
    const cached = cacheGet<SearchSuggestionPayload>(CACHE_KEY);
    if (cached) {
      queryClient.setQueryData(["search-suggestions"], cached.data);
      return;
    }

    queryClient.prefetchQuery({
      queryKey: ["search-suggestions"],
      queryFn: async () => {
        const [catsRes, prodsRes] = await Promise.all([
          supabase
            .from("products")
            .select("category")
            .eq("moderation_status", "approved")
            .limit(500),
          supabase
            .from("products")
            .select("id, name, category, images")
            .eq("moderation_status", "approved")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        const categoryCounts = new Map<string, number>();
        for (const row of catsRes.data || []) {
          if (!row.category) continue;
          categoryCounts.set(row.category, (categoryCounts.get(row.category) || 0) + 1);
        }
        const categories = Array.from(categoryCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const popularProducts = (prodsRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          image: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
        }));

        const payload: SearchSuggestionPayload = { categories, popularProducts };
        cacheSet(CACHE_KEY, payload, CACHE_TTL);
        return payload;
      },
      staleTime: CACHE_TTL,
    });
  };

  // Cleanup ref si le composant remount
  useEffect(() => () => { triggeredRef.current = false; }, []);

  return {
    /** À brancher sur onFocus du champ — respecte le mode connexion */
    onSearchFocus: () => trigger(false),
    /** À brancher sur onChange du champ — l'utilisateur tape, intention forte → forcer */
    onSearchType: () => trigger(true),
  };
};
