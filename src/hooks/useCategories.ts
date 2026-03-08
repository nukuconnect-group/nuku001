import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DbCategory {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  subcategories: string[];
}

export function useCategories(activeOnly = true) {
  return useQuery({
    queryKey: ["categories", activeOnly],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Categories fetch error:", error);
        throw error;
      }
      return (data as unknown as DbCategory[]) || [];
    },
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}
