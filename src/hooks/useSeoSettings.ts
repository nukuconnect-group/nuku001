import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SeoOverride {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  og_image_url?: string | null;
  canonical_path?: string | null;
  no_index?: boolean | null;
}

// Lightweight in-memory cache so we don't refetch the same route on every navigation
const cache = new Map<string, SeoOverride | null>();

export function useSeoSettings(route?: string): SeoOverride | null {
  const [data, setData] = useState<SeoOverride | null>(
    route && cache.has(route) ? cache.get(route)! : null
  );

  useEffect(() => {
    if (!route) return;
    if (cache.has(route)) {
      setData(cache.get(route)!);
      return;
    }
    let active = true;
    (async () => {
      const { data: row } = await (supabase as any)
        .from("seo_settings")
        .select("title,description,keywords,og_image_url,canonical_path,no_index,is_draft")
        .eq("route", route)
        .maybeSingle();
      // Drafts must NOT be served to visitors — only published entries override defaults
      const value = row && !(row as any).is_draft ? (row as SeoOverride) : null;
      cache.set(route, value);
      if (active) setData(value);
    })();
    return () => {
      active = false;
    };
  }, [route]);

  return data;
}

export function clearSeoCache(route?: string) {
  if (route) cache.delete(route);
  else cache.clear();
}
