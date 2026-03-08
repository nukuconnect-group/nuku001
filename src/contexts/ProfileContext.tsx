import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileContextType {
  user: any;
  profile: any;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<any>) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  user: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
  updateProfile: () => {},
});

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string, retries = 3) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
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
      
      // After retries, still no profile
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        fetchingRef.current = false;
        return;
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // Reset fetching state on new login to allow fresh fetch
        fetchingRef.current = false;
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{ user, profile, isLoading, refreshProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};
