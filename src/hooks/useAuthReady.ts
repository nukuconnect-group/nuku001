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
    // Longer timeout for PWA/installed apps on slow connections
    const timeoutMs = window.matchMedia?.('(display-mode: standalone)')?.matches ? 5000 : 3000;
    const readyTimeout = window.setTimeout(() => {
      if (!isMounted) return;
      // Instead of clearing session, try one more getSession before giving up
      supabase.auth.getSession().then(({ data: { session: lastChance } }) => {
        if (!isMounted) return;
        setSession(lastChance);
        setUser(lastChance?.user ?? null);
        setIsReady(true);
      }).catch(() => {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setIsReady(true);
      });
    }, timeoutMs);

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
