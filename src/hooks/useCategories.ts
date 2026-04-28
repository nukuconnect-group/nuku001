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
  image_url?: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useCategories(activeOnly = true) {
  return useQuery({
    queryKey: ["categories", activeOnly],
    queryFn: async () => {
      try {
        let query = supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });

        if (activeOnly) {
          query = query.eq("is_active", true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as unknown as DbCategory[]) || [];
      } catch (e) {
        console.warn("Supabase client failed for categories, using direct fetch:", e);
        const activeFilter = activeOnly ? "&is_active=eq.true" : "";
        const url = `${SUPABASE_URL}/rest/v1/categories?select=*&order=sort_order.asc${activeFilter}`;
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        });
        if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
        const data = await res.json();
        return (data as DbCategory[]) || [];
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 5000),
  });
}
