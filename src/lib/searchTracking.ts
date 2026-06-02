import { supabase } from "@/integrations/supabase/client";

export type SearchMode = "text" | "voice" | "image" | "qr";

function getSessionId(): string {
  try {
    let sid = localStorage.getItem("nk_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("nk_session_id", sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

/** Fire-and-forget: enregistre une recherche pour le module Analytics admin. */
export async function trackSearch(params: {
  query: string;
  mode?: SearchMode;
  category?: string | null;
  resultCount?: number;
  pagePath?: string;
}) {
  const query = (params.query || "").trim();
  if (!query) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("search_queries" as any).insert({
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      query: query.slice(0, 200),
      mode: params.mode ?? "text",
      category: params.category ?? null,
      result_count: params.resultCount ?? 0,
      page_path: params.pagePath ?? (typeof window !== "undefined" ? window.location.pathname : null),
    } as any);
  } catch {
    /* silencieux : ne pas casser l'UX si l'analytics échoue */
  }
}

const MODE_KEY = "nk_last_search_mode";
export function rememberSearchMode(mode: SearchMode) {
  try { sessionStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
}
export function consumeSearchMode(): SearchMode {
  try {
    const m = sessionStorage.getItem(MODE_KEY) as SearchMode | null;
    sessionStorage.removeItem(MODE_KEY);
    return m || "text";
  } catch { return "text"; }
}
