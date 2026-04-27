import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface OfflineFallbackProps {
  /** Titre adapté au contexte ex: "Produits indisponibles" */
  title?: string;
  /** Description adaptée au contexte */
  description?: string;
  /** Callback de retry custom — sinon invalide les queries en cours */
  onRetry?: () => void;
  /** Clé(s) de query à invalider lors du retry */
  queryKeys?: string[][];
}

/**
 * Affiché quand aucune donnée n'est disponible (ni en cache, ni via réseau).
 * Le bouton "Réessayer" est désactivé tant que le navigateur est hors-ligne,
 * et se réactive automatiquement à la reconnexion.
 */
export const OfflineFallback = ({
  title,
  description,
  onRetry,
  queryKeys,
}: OfflineFallbackProps) => {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const [autoRetried, setAutoRetried] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else if (queryKeys?.length) {
        await Promise.all(
          queryKeys.map((k) => queryClient.invalidateQueries({ queryKey: k }))
        );
      } else {
        await queryClient.invalidateQueries();
      }
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  };

  // Auto-retry une fois quand on retrouve la connexion
  useEffect(() => {
    if (isOnline && !autoRetried) {
      setAutoRetried(true);
      handleRetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const isOffline = !isOnline;

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] items-center justify-center px-4 py-10"
    >
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {title || (isOffline ? "Vous êtes hors-ligne" : "Contenu indisponible")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {description ||
              (isOffline
                ? "Aucune donnée enregistrée pour cette page. Reconnectez-vous au réseau pour la charger."
                : "Impossible de charger cette page. Vérifiez votre connexion et réessayez.")}
          </p>
        </div>

        {isOffline && (
          <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            En attente de connexion…
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button
            onClick={handleRetry}
            disabled={isOffline || retrying}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Chargement…" : "Réessayer"}
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Accueil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OfflineFallback;
