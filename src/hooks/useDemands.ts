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
      try {
        let query = supabase
          .from("demands")
          .select(`*, profile:profiles!demands_profile_id_fkey(id, full_name, avatar_url, user_type, location)`)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (category && category !== "all") {
          query = query.eq("category", category);
        }

        const { data, error } = await query;
        if (error) {
          console.warn("Demands fetch error:", error.message);
          return [] as Demand[];
        }
        return (data || []) as Demand[];
      } catch (e) {
        console.warn("Demands fetch exception:", e);
        return [] as Demand[];
      }
    },
    retry: 1,
    staleTime: 30000,
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Veuillez vous connecter pour publier une demande.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) throw new Error("Erreur de profil: " + profileError.message);
      if (!profile) throw new Error("Profil non trouvé. Veuillez compléter votre profil.");

      const { data, error } = await supabase
        .from("demands")
        .insert({
          user_id: session.user.id,
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
      // Trigger async AI moderation (non-blocking)
      if (data?.id) {
        supabase.functions.invoke("moderate-content", { body: { type: "demand", id: data.id } }).catch(err => console.warn("Demand moderation:", err));
      }
      // Note: user will receive notifications about verification status
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
};
