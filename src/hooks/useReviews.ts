import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_mine?: boolean;
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
      const { data, error } = await supabase.rpc("get_product_reviews" as any, {
        _product_id: productId,
      });
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        is_mine: r.is_mine,
        profiles: { full_name: r.author_name, avatar_url: r.author_avatar_url },
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
