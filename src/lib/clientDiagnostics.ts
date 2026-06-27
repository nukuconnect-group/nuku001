/**
 * Journal de diagnostic côté client (Realtime, ChunkLoadError, prix paliers…).
 * - Stocké dans localStorage (ring buffer 500 entrées) pour survivre aux reloads.
 * - Émet des CustomEvent("nuku:client-diag") pour les écrans temps réel (admin).
 * - Optionnel: si Sentry global est présent (window.Sentry), forward.
 */

export type ClientDiagLevel = "info" | "warn" | "error";
export type ClientDiagSource =
  | "realtime"
  | "chunk"
  | "price-tiers"
  | "home"
  | "share-og"
  | "generic";

export interface ClientDiagEntry {
  id: string;
  ts: number;
  level: ClientDiagLevel;
  source: ClientDiagSource;
  message: string;
  isMobile: boolean;
  url: string;
  ua: string;
  meta?: Record<string, unknown>;
}

const KEY = "nk_client_diag_v1";
const MAX = 500;

const isMobileUA = () => {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const safeRead = (): ClientDiagEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const safeWrite = (entries: ClientDiagEntry[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)));
  } catch {
    /* quota → ignore */
  }
};

export function logClientDiag(
  source: ClientDiagSource,
  message: string,
  opts: { level?: ClientDiagLevel; meta?: Record<string, unknown> } = {},
) {
  const entry: ClientDiagEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    level: opts.level ?? "error",
    source,
    message: String(message).slice(0, 500),
    isMobile: isMobileUA(),
    url: typeof location !== "undefined" ? location.href : "",
    ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
    meta: opts.meta,
  };

  const list = safeRead();
  list.push(entry);
  safeWrite(list);

  try {
    window.dispatchEvent(new CustomEvent("nuku:client-diag", { detail: entry }));
  } catch {
    /* noop */
  }

  // Sentry (optionnel, si déjà chargé par ailleurs).
  try {
    const w = window as unknown as {
      Sentry?: { captureMessage?: (m: string, lvl?: string) => void };
    };
    w.Sentry?.captureMessage?.(`[${source}] ${entry.message}`, entry.level);
  } catch {
    /* noop */
  }

  if (typeof console !== "undefined") {
    const fn = entry.level === "error" ? console.error : entry.level === "warn" ? console.warn : console.info;
    fn(`[diag:${source}] ${entry.message}`, opts.meta || "");
  }
}

export function getClientDiag(filter?: { source?: ClientDiagSource; mobileOnly?: boolean }): ClientDiagEntry[] {
  const list = safeRead();
  return list.filter((e) => {
    if (filter?.source && e.source !== filter.source) return false;
    if (filter?.mobileOnly && !e.isMobile) return false;
    return true;
  });
}

export function clearClientDiag() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent("nuku:client-diag-clear"));
  } catch {
    /* noop */
  }
}

if (typeof window !== "undefined") {
  (window as unknown as { __nukuClientDiag?: unknown }).__nukuClientDiag = {
    get: getClientDiag,
    log: logClientDiag,
    clear: clearClientDiag,
  };
}
