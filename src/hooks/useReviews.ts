import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function useReviews(productId: string) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      if (!isUUID(productId)) return [];
      const { data, error } = await supabase
        .from("reviews" as any)
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const reviews = (data || []) as any[];
      if (reviews.length === 0) return [];
      const userIds = Array.from(new Set(reviews.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return reviews.map((r) => ({
        ...r,
        profiles: profileMap.get(r.user_id) || null,
      })) as Review[];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAverageRating(productId: string) {
  const { data: reviews } = useReviews(productId);
  if (!reviews || reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / reviews.length, count: reviews.length };
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, rating, comment }: { productId: string; rating: number; comment: string }) => {
      if (!isUUID(productId)) throw new Error("Les avis ne sont disponibles que pour les produits réels, pas les produits de démonstration.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("reviews" as any).upsert(
        { product_id: productId, user_id: user.id, rating, comment } as any,
        { onConflict: "product_id,user_id" } as any
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", vars.productId] });
    },
  });
}
