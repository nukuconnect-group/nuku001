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
  const profileCache = useRef<Record<string, any>>({});
  const sessionHandled = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    // Use cache to avoid redundant fetches
    if (profileCache.current[userId]) {
      setProfile(profileCache.current[userId]);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      profileCache.current[userId] = data;
      setProfile(data);
    } catch (e) {
      console.error("Profile fetch error:", e);
    }
    setIsLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      // Clear cache to force refresh
      delete profileCache.current[user.id];
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const updateProfile = useCallback((updates: Partial<any>) => {
    setProfile((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      if (prev.user_id) profileCache.current[prev.user_id] = updated;
      return updated;
    });
  }, []);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      sessionHandled.current = true;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        profileCache.current = {};
        setIsLoading(false);
        return;
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setIsLoading(false);
      }
    });

    // Then check existing session (only if not already set by onAuthStateChange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!user) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id);
        } else {
          setIsLoading(false);
        }
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
