import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export async function getFreshAuthSession(): Promise<Session> {
  let { data: { session } } = await supabase.auth.getSession();

  if (session?.refresh_token) {
    const { data: refreshed, error } = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });
    if (!error && refreshed?.session) session = refreshed.session;
  }

  if (!session?.access_token) {
    throw new Error("Session expirée. Veuillez vous reconnecter pour finaliser votre abonnement.");
  }

  return session;
}

export async function invokeAuthenticatedFunction<T = unknown>(
  functionName: string,
  payload: Record<string, unknown>,
  session?: Session,
): Promise<T> {
  const activeSession = session ?? await getFreshAuthSession();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeSession.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Erreur ${response.status}`);
  }

  return data as T;
}