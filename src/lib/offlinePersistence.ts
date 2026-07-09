import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * Persister React Query basé sur localStorage.
 * Utilisé via <PersistQueryClientProvider> dans App.tsx pour rendre
 * les données disponibles instantanément au rechargement et hors-ligne.
 *
 * IMPORTANT (sécurité / confidentialité) :
 * - La clé de cache est scopée par utilisateur (voir setPersistUserScope).
 * - Le composant <AuthCacheGuard/> purge le cache React Query et l'entrée
 *   localStorage à chaque changement d'utilisateur pour empêcher qu'un
 *   utilisateur voie les données mises en cache d'un autre utilisateur
 *   sur le même navigateur/PWA.
 */

const BASE_KEY = "nukuconnect-rq-cache";
const SCOPE_STORAGE_KEY = "nukuconnect-rq-scope";

// Lecture synchrone de la portée utilisateur active pour construire la clé
// dès le boot (avant que Supabase n'ait rétabli la session).
function readInitialScope(): string {
  if (typeof window === "undefined") return "anon";
  try {
    return window.localStorage.getItem(SCOPE_STORAGE_KEY) || "anon";
  } catch {
    return "anon";
  }
}

let currentScope = readInitialScope();

export function getPersistUserScope(): string {
  return currentScope;
}

/**
 * Change la portée utilisateur du cache persistant.
 * Retourne true si le scope a changé (le caller doit alors purger le cache).
 */
export function setPersistUserScope(userId: string | null): boolean {
  const next = userId ?? "anon";
  if (next === currentScope) return false;
  currentScope = next;
  try {
    window.localStorage.setItem(SCOPE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * Purge toutes les entrées de cache persistant (toutes portées confondues).
 * Utilisé sur logout / changement d'utilisateur pour empêcher toute fuite
 * de données entre comptes.
 */
export function purgePersistedCache() {
  if (typeof window === "undefined") return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(BASE_KEY)) toDelete.push(k);
    }
    toDelete.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export const createOfflinePersister = () => {
  if (typeof window === "undefined") return undefined;
  try {
    return createSyncStoragePersister({
      storage: window.localStorage,
      // Clé scopée par utilisateur — critique pour l'isolation des données
      key: `${BASE_KEY}:${currentScope}`,
      throttleTime: 1000,
    });
  } catch {
    return undefined;
  }
};

export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24h
export const PERSIST_BUSTER = "v2-user-scoped";
