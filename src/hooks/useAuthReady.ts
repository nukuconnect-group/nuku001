import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuthReady() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;
    const readyTimeout = window.setTimeout(() => {
      if (!isMounted) return;
      setSession(null);
      setUser(null);
      setIsReady(true);
    }, 2200);

    const applyAuthState = (nextSession: Session | null) => {
      if (!isMounted) return;
      window.clearTimeout(readyTimeout);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applyAuthState(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        applyAuthState(existingSession);
      })
      .catch((error) => {
        console.warn("Auth session restore failed:", error);
        applyAuthState(null);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(readyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, isReady };
}
