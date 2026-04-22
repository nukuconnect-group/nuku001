import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FreePlanStatus {
  exists: boolean;
  plan?: string;
  status?: string;
  expires_at?: string | null;
  free_renewals_used?: number;
  renewals_remaining?: number;
  is_expired?: boolean;
  can_renew?: boolean;
}

/**
 * Suit l'état du plan gratuit : expiration, renouvellements restants (max 2),
 * et exposes une fonction de renouvellement.
 */
export const useFreePlanStatus = (userId?: string | null) => {
  const [status, setStatus] = useState<FreePlanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setStatus(null); setLoading(false); return; }
    const { data } = await supabase.rpc("get_free_plan_status" as any, { p_user_id: userId });
    setStatus((data as any) || { exists: false });
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const renew = useCallback(async (): Promise<{ success: boolean; error?: string; renewals_remaining?: number }> => {
    const { data, error } = await supabase.rpc("renew_free_subscription" as any);
    if (error) return { success: false, error: error.message };
    const result = data as any;
    await refresh();
    return result;
  }, [refresh]);

  return { status, loading, refresh, renew };
};
