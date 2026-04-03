import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

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
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, retries = 3) => {
    if (fetchingRef.current && lastUserIdRef.current === userId) return;
    fetchingRef.current = true;
    lastUserIdRef.current = userId;
    
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
        setIsLoading(false);
        fetchingRef.current = false;
        return;
      }
      
      // Profile not found yet (trigger may still be creating it) — retry
      if (retries > 0) {
        fetchingRef.current = false;
        await new Promise(r => setTimeout(r, 800));
        return fetchProfile(userId, retries - 1);
      }
      
      setProfile(null);
      setIsLoading(false);
    } catch (e) {
      console.error("Profile fetch error:", e);
      setIsLoading(false);
    }
    fetchingRef.current = false;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      fetchingRef.current = false;
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const updateProfile = useCallback((updates: Partial<any>) => {
    setProfile((prev: any) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  // React to auth state changes from useAuthReady
  useEffect(() => {
    if (!isReady) return;

    if (user) {
      fetchingRef.current = false;
      fetchProfile(user.id);
    } else {
      setProfile(null);
      setIsLoading(false);
      lastUserIdRef.current = null;
    }
  }, [user, isReady, fetchProfile]);

  return (
    <ProfileContext.Provider value={{ user, profile, isLoading, isReady, refreshProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};
