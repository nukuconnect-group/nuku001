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

      // Auto-heal: create the profile row if missing (covers users whose
      // signup trigger did not fire). Uses SECURITY DEFINER RPC.
      try {
        const { data: ensuredId } = await supabase.rpc("ensure_my_profile" as any);
        if (ensuredId) {
          const { data: created } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();
          if (requestId !== requestIdRef.current) return;
          if (created) {
            setProfile(created);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("ensure_my_profile failed", e);
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
      .channel(`profile-self-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
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

  // Retry claim_referral on every successful auth (covers email confirmation, mobile, faible connexion)
  // Reads from BOTH localStorage AND user_metadata.referral_code (survives email confirmation in new tabs)
  useEffect(() => {
    if (!user?.id) return;
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("nukuconnect-ref") : null;
    const fromMetadata = user.user_metadata?.referral_code || null;
    const savedRef = fromStorage || fromMetadata;
    if (!savedRef) return;
    supabase.rpc("claim_referral", { p_referral_code: savedRef })
      .then(({ data, error }) => {
        if (!error) {
          if (fromStorage) localStorage.removeItem("nukuconnect-ref");
          // Clear metadata flag so we don't retry on every login
          if (fromMetadata) {
            supabase.auth.updateUser({ data: { referral_code: null } }).catch(() => {});
          }
          console.log("[Referral] Claimed on login:", savedRef, data);
        } else if (
          error.message?.includes("already used") ||
          error.message?.includes("Cannot claim your own") ||
          error.message?.includes("not found")
        ) {
          // Stable errors: drop the code so we don't retry forever
          if (fromStorage) localStorage.removeItem("nukuconnect-ref");
          if (fromMetadata) supabase.auth.updateUser({ data: { referral_code: null } }).catch(() => {});
        } else {
          console.warn("[Referral] Claim retry failed (will retry next session):", error.message);
        }
      });
  }, [user?.id, user?.user_metadata?.referral_code]);

  return (
    <ProfileContext.Provider value={{ user, profile, isLoading, isReady, refreshProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};