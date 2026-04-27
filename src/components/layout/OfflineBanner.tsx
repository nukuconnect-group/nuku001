import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Bannière globale affichée en haut de l'écran lorsque l'utilisateur
 * perd la connexion. Montre un message de réussite éphémère lorsqu'il
 * la retrouve, et déclenche une re-synchronisation des requêtes.
 */
export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setHasBeenOffline(true);
      return;
    }
    if (hasBeenOffline) {
      // Resync : re-fetch toutes les requêtes obsolètes
      queryClient.invalidateQueries();
      setShowBackOnline(true);
      const t = setTimeout(() => setShowBackOnline(false), 2500);
      return () => clearTimeout(t);
    }
  }, [isOnline, hasBeenOffline, queryClient]);

  if (isOnline && !showBackOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[100] px-3 py-2 text-center text-sm font-medium shadow-md transition-transform ${
        isOnline
          ? "bg-primary text-primary-foreground"
          : "bg-destructive text-destructive-foreground"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Connexion rétablie — synchronisation…</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>
              Mode hors-ligne — affichage des données mises en cache
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;
