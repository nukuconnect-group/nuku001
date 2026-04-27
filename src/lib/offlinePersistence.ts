import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * Persister React Query basé sur localStorage.
 * Utilisé via <PersistQueryClientProvider> dans App.tsx pour rendre
 * les données disponibles instantanément au rechargement et hors-ligne.
 */
export const createOfflinePersister = () => {
  if (typeof window === "undefined") return undefined;
  try {
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: "nukuconnect-rq-cache",
      throttleTime: 1000,
    });
  } catch {
    return undefined;
  }
};

export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24h
export const PERSIST_BUSTER = "v1";
