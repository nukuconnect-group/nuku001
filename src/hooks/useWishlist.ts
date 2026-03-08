import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function useWishlist() {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("wishlist" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as { id: string; user_id: string; product_id: string; created_at: string }[];
    },
    enabled: !!userId,
  });

  const addToWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("wishlist" as any).insert({ user_id: userId, product_id: productId } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", userId] }),
  });

  const removeFromWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("wishlist" as any).delete().eq("user_id", userId).eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", userId] }),
  });

  const isInWishlist = (productId: string) => {
    return query.data?.some((item) => item.product_id === productId) ?? false;
  };

  const toggleWishlist = async (productId: string) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist.mutateAsync(productId);
    } else {
      await addToWishlist.mutateAsync(productId);
    }
  };

  return {
    wishlist: query.data || [],
    isLoading: query.isLoading,
    isInWishlist,
    toggleWishlist,
    isAuthenticated: !!userId,
  };
}
