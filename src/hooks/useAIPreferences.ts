import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIPreferences {
  preferred_categories: string[];
  interests: string[];
  budget_min: number | null;
  budget_max: number | null;
  radius_km: number;
  preferred_region: string | null;
  notes: string | null;
  use_purchase_history: boolean;
  use_search_history: boolean;
}

export const defaultAIPreferences: AIPreferences = {
  preferred_categories: [],
  interests: [],
  budget_min: null,
  budget_max: null,
  radius_km: 50,
  preferred_region: null,
  notes: null,
  use_purchase_history: true,
  use_search_history: true,
};

export const useAIPreferences = (userId?: string) => {
  const [prefs, setPrefs] = useState<AIPreferences>(defaultAIPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_ai_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setPrefs({
        preferred_categories: data.preferred_categories || [],
        interests: data.interests || [],
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        radius_km: data.radius_km ?? 50,
        preferred_region: data.preferred_region,
        notes: data.notes,
        use_purchase_history: data.use_purchase_history,
        use_search_history: data.use_search_history,
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (next: AIPreferences) => {
      if (!userId) return { error: "not_authenticated" };
      setSaving(true);
      const { error } = await supabase
        .from("user_ai_preferences")
        .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
      setSaving(false);
      if (!error) setPrefs(next);
      return { error: error?.message };
    },
    [userId]
  );

  return { prefs, setPrefs, loading, saving, save, reload: load };
};
