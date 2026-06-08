// @refresh reset
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Auth readiness hook.
 * 
 * Important: we NEVER force session=null on timeout. If getSession() is slow
 * (cold start, slow network, PWA wake-up), we keep waiting via 
 * onAuthStateChange instead of pretending the user is logged out.
 * The only way `user` becomes null is:
 *   - getSession() explicitly returns no session, OR
 *   - onAuthStateChange fires with a null session (real sign-out / token revoked)
 */
export function useAuthReady() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initializedRef = useRef(false);
  const readyRef = useRef(false);
  const getSessionResolvedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const markReady = (nextSession: Session | null, forceReady = false) => {
      if (!isMounted) return;
      
      // Update data
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      
      // We only consider the state "ready" if:
      // 1. We got a non-null session (user is logged in)
      // 2. OR forceReady is true (getSession finished OR explicit SIGNED_OUT event)
      if ((nextSession !== null || forceReady) && !readyRef.current) {
        readyRef.current = true;
        setIsReady(true);
      }
    };

    // Subscribe FIRST so we never miss INITIAL_SESSION / TOKEN_REFRESHED events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Real sign-out always wins and forces ready
      if (event === "SIGNED_OUT") {
        markReady(null, true);
        return;
      }
      
      // If we get a session, we are ready
      if (nextSession) {
        markReady(nextSession, true);
      } else if (getSessionResolvedRef.current) {
        // If we don't have a session, we only mark ready if getSession already finished
        // This avoids the "null flicker" during INITIAL_SESSION event
        markReady(null, true);
      }
    });

    // Then read the current session from storage
    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        getSessionResolvedRef.current = true;
        markReady(existingSession ?? null, true);
      })
      .catch((error) => {
        console.warn("Auth session restore failed (will keep waiting for events):", error);
        getSessionResolvedRef.current = true;
        // Even on error, we mark ready to not block the UI forever
        if (!readyRef.current) {
          readyRef.current = true;
          setIsReady(true);
        }
      });

    // Soft fallback: after 8s, mark ready so the UI isn't stuck on a loader.
    const softTimeout = window.setTimeout(() => {
      if (!isMounted || readyRef.current) return;
      readyRef.current = true;
      setIsReady(true);
    }, 8000);

    return () => {
      isMounted = false;
      window.clearTimeout(softTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, isReady };
}
