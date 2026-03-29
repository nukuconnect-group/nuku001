import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useResolvedUserType(userId?: string | null, profileUserType?: string | null) {
  const [hasDriverProfile, setHasDriverProfile] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkDriverProfile = async () => {
      if (!userId) {
        if (mounted) setHasDriverProfile(false);
        return;
      }

      const { data } = await supabase
        .from("driver_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (mounted) setHasDriverProfile(!!data);
    };

    checkDriverProfile();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return useMemo(() => {
    if (hasDriverProfile) return "driver";
    return profileUserType || "buyer";
  }, [hasDriverProfile, profileUserType]);
}