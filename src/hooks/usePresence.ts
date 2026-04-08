import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks current user's online presence and updates it periodically.
 * Call once at app level.
 */
export function usePresenceTracker() {
  const userIdRef = useRef<string | null>(null);

  // Resolve user ID once and cache it
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });
    // Also get current session
    supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data.session?.user?.id ?? null;
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const updatePresence = useCallback(async (isOnline: boolean) => {
    const userId = userIdRef.current;
    if (!userId) return;

    await supabase.from("user_presence").upsert(
      { user_id: userId, is_online: isOnline, last_seen: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }, []);

  useEffect(() => {
    // Small delay to let auth state resolve
    const initTimeout = setTimeout(() => updatePresence(true), 1000);

    // Heartbeat every 60s (was 30s)
    const interval = setInterval(() => updatePresence(true), 60000);

    const handleVisibility = () => {
      updatePresence(document.visibilityState === "visible");
    };
    const handleBeforeUnload = () => {
      const userId = userIdRef.current;
      if (userId) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${userId}`,
          JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(initTimeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updatePresence(false);
    };
  }, [updatePresence]);
}

/**
 * Subscribe to presence changes for a list of user IDs.
 * Returns a Map of userId -> isOnline.
 */
export function usePresenceStatus(
  userIds: string[],
  onUpdate: (presenceMap: Map<string, boolean>) => void
) {
  useEffect(() => {
    if (!userIds.length) return;

    const fetchPresence = async () => {
      const { data } = await supabase
        .from("user_presence")
        .select("user_id, is_online")
        .in("user_id", userIds);

      if (data) {
        const map = new Map<string, boolean>();
        data.forEach((p: any) => map.set(p.user_id, p.is_online));
        onUpdate(map);
      }
    };
    fetchPresence();

    const channel = supabase
      .channel("presence-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row = payload.new as any;
        if (userIds.includes(row.user_id)) {
          fetchPresence();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userIds.join(",")]);
}
