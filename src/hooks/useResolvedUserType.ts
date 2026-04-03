import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const driverProfileCache = new Map<string, boolean>();
const driverProfileRequests = new Map<string, Promise<boolean>>();

async function getHasDriverProfile(userId: string) {
  const cachedValue = driverProfileCache.get(userId);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const activeRequest = driverProfileRequests.get(userId);
  if (activeRequest) {
    return activeRequest;
  }

  const request = (async () => {
    try {
      const { data, error } = await supabase
        .from("driver_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const hasDriverProfile = !error && !!data;

      if (!error) {
        driverProfileCache.set(userId, hasDriverProfile);
      }

      return hasDriverProfile;
    } catch {
      driverProfileRequests.delete(userId);
      return false;
    } finally {
      driverProfileRequests.delete(userId);
    }
  })();

  driverProfileRequests.set(userId, request);
  return request;
}

export function useResolvedUserType(userId?: string | null, profileUserType?: string | null) {
  const [hasDriverProfile, setHasDriverProfile] = useState(() => {
    if (profileUserType === "driver") {
      return true;
    }

    return userId ? driverProfileCache.get(userId) ?? false : false;
  });

  useEffect(() => {
    let mounted = true;

    if (profileUserType === "driver") {
      setHasDriverProfile(true);
      return () => {
        mounted = false;
      };
    }

    setHasDriverProfile(userId ? driverProfileCache.get(userId) ?? false : false);

    if (!userId) {
      return () => {
        mounted = false;
      };
    }

    getHasDriverProfile(userId).then((value) => {
      if (mounted) {
        setHasDriverProfile(value);
      }
    });

    return () => {
      mounted = false;
    };
  }, [userId, profileUserType]);

  return useMemo(() => {
    if (hasDriverProfile) return "driver";
    // Don't default to "buyer" - return the actual profile type or null
    return profileUserType || null;
  }, [hasDriverProfile, profileUserType]);
}