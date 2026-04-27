/**
 * Cache local persistant (localStorage) pour fallback offline / connexion lente.
 * - TTL configurable
 * - Sérialisation JSON sécurisée
 * - Préfixe pour éviter les collisions
 */

const PREFIX = "nuku:cache:";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24h

interface CacheEntry<T> {
  data: T;
  expires: number;
  cachedAt: number;
}

export const cacheGet = <T>(key: string): { data: T; cachedAt: number } | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expires) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return { data: entry.data, cachedAt: entry.cachedAt };
  } catch {
    return null;
  }
};

export const cacheSet = <T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS) => {
  try {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      expires: Date.now() + ttlMs,
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Quota exceeded → purge anciens caches
    try {
      pruneCache();
      localStorage.setItem(
        PREFIX + key,
        JSON.stringify({ data, cachedAt: Date.now(), expires: Date.now() + ttlMs })
      );
    } catch {
      console.warn("[cache] storage full, skip", key);
    }
  }
};

export const cacheDelete = (key: string) => {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
};

/** Supprime les entrées expirées. */
export const pruneCache = () => {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const entry = JSON.parse(raw);
        if (entry?.expires && entry.expires < now) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {}
};

// Auto-prune au démarrage
if (typeof window !== "undefined") {
  setTimeout(pruneCache, 2000);
}
