import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const DEBUG =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) ||
  (typeof window !== "undefined" && window.localStorage?.getItem("debug:edge") === "1");

function dbg(...args: unknown[]) {
  if (DEBUG) console.log("[edgeFn]", ...args);
}

export async function getFreshAuthSession(forceRefresh = false): Promise<Session> {
  let { data: { session } } = await supabase.auth.getSession();

  if ((forceRefresh || session?.expires_at) && session?.refresh_token) {
    const expiresAt = (session.expires_at ?? 0) * 1000;
    const needsRefresh = forceRefresh || expiresAt - Date.now() < 60_000;
    if (needsRefresh) {
      const { data: refreshed, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      if (!error && refreshed?.session) {
        session = refreshed.session;
        dbg("session refreshed", { userId: session.user?.id, expiresAt: session.expires_at });
      } else if (error) {
        dbg("refresh failed", error.message);
      }
    }
  }

  if (!session?.access_token) {
    throw new Error("Session expirée. Veuillez vous reconnecter pour finaliser votre abonnement.");
  }

  return session;
}

async function callEdge<T>(
  functionName: string,
  payload: Record<string, unknown>,
  session: Session,
): Promise<{ ok: boolean; status: number; data: any; raw: string }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  dbg("→ POST", functionName, {
    hasAuth: !!session.access_token,
    userId: session.user?.id,
    payloadKeys: Object.keys(payload),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { error: raw || `Erreur ${response.status}` };
  }

  dbg("← response", functionName, { status: response.status, raw: raw.slice(0, 500) });
  return { ok: response.ok, status: response.status, data, raw } as T extends never ? never : { ok: boolean; status: number; data: any; raw: string };
}

export async function invokeAuthenticatedFunction<T = unknown>(
  functionName: string,
  payload: Record<string, unknown>,
  session?: Session,
): Promise<T> {
  let activeSession = session ?? await getFreshAuthSession();

  const maxAttempts = 3;
  let lastError: { status: number; data: any } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await callEdge<T>(functionName, payload, activeSession);

    if (result.ok) return result.data as T;

    lastError = { status: result.status, data: result.data };

    // Retry on 401 with forced refresh, on 5xx with backoff
    const isAuthError = result.status === 401;
    const isServerError = result.status >= 500 && result.status < 600;

    if (!isAuthError && !isServerError) {
      throw new Error(result.data?.error || result.data?.message || `Erreur ${result.status}`);
    }

    if (attempt === maxAttempts) break;

    if (isAuthError) {
      dbg(`401 received, forcing session refresh (attempt ${attempt})`);
      try {
        activeSession = await getFreshAuthSession(true);
      } catch (e) {
        throw new Error("Session expirée. Veuillez vous reconnecter pour finaliser votre abonnement.");
      }
    }

    // Exponential backoff: 400ms, 1200ms
    const backoff = 400 * Math.pow(3, attempt - 1);
    dbg(`retrying in ${backoff}ms`);
    await new Promise((r) => setTimeout(r, backoff));
  }

  throw new Error(
    lastError?.data?.error || lastError?.data?.message || `Erreur ${lastError?.status ?? "réseau"}`,
  );
}
