import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * Persiste le cache React Query dans localStorage pour que les données
 * restent disponibles immédiatement au rechargement / hors-ligne.
 *
 * - buster : invalide le cache lorsqu'on change de version d'app
 * - maxAge : 24h, évite de servir des données trop anciennes
 * - dehydrate : on ne persiste que les requêtes qui ont des données
 */
export const setupOfflinePersistence = (queryClient: QueryClient) => {
  if (typeof window === "undefined") return;

  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "nukuconnect-rq-cache",
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24h
      buster: "v1",
      dehydrateOptions: {
        shouldDehydrateQuery: (q) =>
          q.state.status === "success" && !!q.state.data,
      },
    });
  } catch (e) {
    // localStorage indisponible (mode privé strict) : on ignore
    console.warn("[offline] persistence indisponible", e);
  }
};
