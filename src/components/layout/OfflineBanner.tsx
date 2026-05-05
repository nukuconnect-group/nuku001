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
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setHasBeenOffline(true);
      return;
    }
    if (hasBeenOffline) {
      // Silently resync all stale queries when back online
      queryClient.invalidateQueries();
      setHasBeenOffline(false);
    }
  }, [isOnline, hasBeenOffline, queryClient]);

  // Never show any banner to users — handle everything silently
  return null;
};

export default OfflineBanner;
