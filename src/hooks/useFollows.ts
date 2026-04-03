import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";

export const useFollows = () => {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: following = [], isLoading } = useQuery({
    queryKey: ["follows", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, created_at")
        .eq("follower_id", profile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, created_at")
        .eq("following_id", profile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const followMutation = useMutation({
    mutationFn: async (followingId: string) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: profile.id, following_id: followingId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (followingId: string) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", profile.id)
        .eq("following_id", followingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
    },
  });

  const isFollowing = useCallback(
    (profileId: string) => following.some((f) => f.following_id === profileId),
    [following]
  );

  const toggleFollow = useCallback(
    async (profileId: string) => {
      if (isFollowing(profileId)) {
        await unfollowMutation.mutateAsync(profileId);
      } else {
        await followMutation.mutateAsync(profileId);
      }
    },
    [isFollowing, followMutation, unfollowMutation]
  );

  return {
    following,
    followers,
    isFollowing,
    toggleFollow,
    isLoading,
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
};

export const useProfileFollowerCount = (profileId: string | undefined) => {
  return useQuery({
    queryKey: ["follower-count", profileId],
    queryFn: async () => {
      if (!profileId) return 0;
      const { data, error } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", profileId);
      if (error) return 0;
      return (data as any)?.length ?? 0;
    },
    enabled: !!profileId,
  });
};
