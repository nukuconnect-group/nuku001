import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks current user's online presence and updates it periodically.
 * Call once at app level.
 */
export function usePresenceTracker() {
  const updatePresence = useCallback(async (isOnline: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_presence").upsert(
      { user_id: user.id, is_online: isOnline, last_seen: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }, []);

  useEffect(() => {
    updatePresence(true);

    // Heartbeat every 30s
    const interval = setInterval(() => updatePresence(true), 30000);

    // Go offline on tab close / visibility change
    const handleVisibility = () => {
      updatePresence(document.visibilityState === "visible");
    };
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability
      const user = JSON.parse(localStorage.getItem("sb-fpnhdihvnfsiymopbjgt-auth-token") || "{}");
      const userId = user?.user?.id;
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

    // Initial fetch
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

    // Realtime
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
