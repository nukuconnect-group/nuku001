import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileContextType {
  user: any;
  profile: any;
  isLoading: boolean;
  isReady: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<any>) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isReady: false,
  refreshProfile: async () => {},
  updateProfile: () => {},
});

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useAuthReady();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string, retries = 3) => {
    const requestId = ++requestIdRef.current;
    lastUserIdRef.current = userId;
    setIsLoading(true);

    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (requestId !== requestIdRef.current) return;

      if (data) {
        setProfile(data);
        setIsLoading(false);
        return;
      }

      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (requestId === requestIdRef.current) {
          return fetchProfile(userId, retries - 1);
        }
        return;
      }

      setProfile(null);
      setIsLoading(false);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.error("Profile fetch error:", e);
      setProfile(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const updateProfile = useCallback((updates: Partial<any>) => {
    setProfile((prev: any) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const currentUserId = user?.id ?? null;

    if (!currentUserId) {
      requestIdRef.current += 1;
      // Clear all cached data when user logs out to prevent data mixing
      if (lastUserIdRef.current !== null) {
        queryClient.clear();
      }
      lastUserIdRef.current = null;
      setProfile(null);
      setIsLoading(false);
      return;
    }

    if (lastUserIdRef.current !== currentUserId) {
      setProfile(null);
      setIsLoading(true);
    }

    fetchProfile(currentUserId);
  }, [user?.id, isReady, fetchProfile]);

  // Realtime sync: when admin verifies / changes the profile, propagate to all
  // pages (dashboard, networks, supplier card) without manual refresh.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-self-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setProfile((prev: any) => prev ? { ...prev, ...(payload.new as any) } : (payload.new as any));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <ProfileContext.Provider value={{ user, profile, isLoading, isReady, refreshProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};