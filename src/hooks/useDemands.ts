import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Demand {
  id: string;
  user_id: string;
  profile_id: string;
  title: string;
  description: string | null;
  category: string;
  quantity: number | null;
  unit: string;
  budget: number | null;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    user_type: string;
    location: string | null;
  };
}

export const useDemands = (category?: string) => {
  return useQuery({
    queryKey: ["demands", category],
    queryFn: async () => {
      let query = supabase
        .from("demands")
        .select(`*, profile:profiles!demands_profile_id_fkey(id, full_name, avatar_url, user_type, location)`)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Demand[];
    },
  });
};

export const useCreateDemand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (demand: {
      title: string;
      description?: string;
      category: string;
      quantity?: number;
      unit?: string;
      budget?: number;
      location?: string;
      image_url?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profil non trouvé");

      const { data, error } = await supabase
        .from("demands")
        .insert({
          user_id: user.id,
          profile_id: profile.id,
          title: demand.title,
          description: demand.description || null,
          category: demand.category,
          quantity: demand.quantity || null,
          unit: demand.unit || "kg",
          budget: demand.budget || null,
          location: demand.location || null,
          image_url: demand.image_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
};
