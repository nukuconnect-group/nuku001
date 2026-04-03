import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Hook that properly handles Supabase auth initialization.
 * Prevents the race condition where onAuthStateChange fires before
 * the session is fully restored from storage.
 */
export function useAuthReady() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 1. Set up listener FIRST (before getSession) so we never miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Use synchronous state updates only — no async/await here
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsReady(true);
      }
    );

    // 2. Then check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, isReady };
}
