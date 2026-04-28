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

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const markReady = (nextSession: Session | null, allowNull = true) => {
      if (!isMounted) return;
      // Don't overwrite an existing session with null unless it's an explicit
      // sign-out event (allowNull=true from onAuthStateChange or getSession success).
      if (nextSession === null && !allowNull && readyRef.current) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!readyRef.current) {
        readyRef.current = true;
        setIsReady(true);
      }
    };

    // Subscribe FIRST so we never miss INITIAL_SESSION / TOKEN_REFRESHED events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Real sign-out always wins
      if (event === "SIGNED_OUT") {
        markReady(null, true);
        return;
      }
      markReady(nextSession ?? null, true);
    });

    // Then read the current session from storage
    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        markReady(existingSession ?? null, true);
      })
      .catch((error) => {
        // Network/transient error: do NOT log the user out.
        // Mark ready with whatever we have (likely null on first load), and
        // rely on onAuthStateChange to deliver the real session shortly.
        console.warn("Auth session restore failed (will keep waiting for events):", error);
        if (!readyRef.current) {
          readyRef.current = true;
          setIsReady(true);
        }
      });

    // Soft fallback: after 8s, mark ready so the UI isn't stuck on a loader.
    // We do NOT clear the session here — if onAuthStateChange later delivers
    // a session, the user will appear logged in without a flicker.
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
