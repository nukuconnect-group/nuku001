/**
 * Cache local persistant (localStorage) pour fallback offline / connexion lente.
 * - TTL configurable
 * - Limite de taille (LRU sur lastAccess) en plus du TTL
 * - Sérialisation JSON sécurisée
 */

const PREFIX = "nuku:cache:";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const MAX_BYTES = 4 * 1024 * 1024; // 4 Mo budget cumulé pour nos entrées
const PRUNE_TARGET_BYTES = 3 * 1024 * 1024; // après nettoyage on vise ~3 Mo

interface CacheEntry<T> {
  data: T;
  expires: number;
  cachedAt: number;
  lastAccess: number;
  size: number;
}

const safeRead = (key: string): CacheEntry<unknown> | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<unknown>;
  } catch {
    return null;
  }
};

export const cacheGet = <T>(key: string): { data: T; cachedAt: number } | null => {
  try {
    const fullKey = PREFIX + key;
    const entry = safeRead(fullKey) as CacheEntry<T> | null;
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      localStorage.removeItem(fullKey);
      return null;
    }
    // Touch lastAccess pour le LRU (sans payer le coût d'écriture si trop fréquent)
    if (Date.now() - (entry.lastAccess || 0) > 60 * 1000) {
      try {
        entry.lastAccess = Date.now();
        localStorage.setItem(fullKey, JSON.stringify(entry));
      } catch {}
    }
    return { data: entry.data, cachedAt: entry.cachedAt };
  } catch {
    return null;
  }
};

export const cacheSet = <T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS) => {
  const fullKey = PREFIX + key;
  const now = Date.now();
  let payload = "";
  try {
    payload = JSON.stringify({
      data,
      cachedAt: now,
      expires: now + ttlMs,
      lastAccess: now,
      size: 0,
    });
  } catch {
    return; // valeur non sérialisable
  }
  const size = payload.length * 2; // approximation UTF-16
  try {
    localStorage.setItem(fullKey, payload);
    enforceSizeBudget(size);
  } catch {
    // Quota navigateur dépassé → purger et réessayer
    pruneCache();
    enforceSizeBudget(size);
    try {
      localStorage.setItem(fullKey, payload);
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

/** Taille totale (octets) occupée par notre namespace de cache. */
const totalSize = (): { total: number; entries: { key: string; entry: CacheEntry<unknown>; bytes: number }[] } => {
  const entries: { key: string; entry: CacheEntry<unknown>; bytes: number }[] = [];
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const bytes = raw.length * 2;
      total += bytes;
      const entry = safeRead(key);
      if (entry) entries.push({ key, entry, bytes });
    }
  } catch {}
  return { total, entries };
};

/** Supprime les entrées expirées. */
export const pruneCache = () => {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const entry = safeRead(key);
      if (!entry) {
        localStorage.removeItem(key);
        continue;
      }
      if (entry.expires && entry.expires < now) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
};

/**
 * S'assure que le cache ne dépasse pas MAX_BYTES.
 * Si dépassé, supprime les entrées en LRU (lastAccess le plus ancien) jusqu'à PRUNE_TARGET_BYTES.
 */
export const enforceSizeBudget = (incomingSize = 0) => {
  try {
    let { total, entries } = totalSize();
    if (total + incomingSize <= MAX_BYTES) return;

    // 1) Purger les expirés d'abord
    pruneCache();
    ({ total, entries } = totalSize());
    if (total + incomingSize <= MAX_BYTES) return;

    // 2) LRU : trier par lastAccess croissant
    entries.sort((a, b) => (a.entry.lastAccess || 0) - (b.entry.lastAccess || 0));
    for (const { key, bytes } of entries) {
      if (total + incomingSize <= PRUNE_TARGET_BYTES) break;
      try {
        localStorage.removeItem(key);
        total -= bytes;
      } catch {}
    }
  } catch {}
};

/** Retourne des stats utiles (debug / UI admin). */
export const getCacheStats = () => {
  const { total, entries } = totalSize();
  return {
    bytes: total,
    megabytes: +(total / (1024 * 1024)).toFixed(2),
    count: entries.length,
    maxMegabytes: +(MAX_BYTES / (1024 * 1024)).toFixed(2),
  };
};

// Auto-prune au démarrage
if (typeof window !== "undefined") {
  setTimeout(() => {
    pruneCache();
    enforceSizeBudget(0);
  }, 2000);
}
