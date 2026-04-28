import { Suspense, useEffect, useState, ReactNode, Component, ErrorInfo } from "react";
import { Loader2, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Loader avec détection de lenteur :
 * - 0-2s : spinner simple
 * - 2-8s : message "chargement plus long que prévu"
 * - >8s  : UI de récupération avec bouton "Réessayer"
 */
const SmartLoader = () => {
  const [phase, setPhase] = useState<"hidden" | "loading" | "slow" | "stuck">("hidden");

  useEffect(() => {
    // Pas d'écran de chargement avant 350ms : navigation instantanée perçue
    const t0 = setTimeout(() => setPhase("loading"), 350);
    const t1 = setTimeout(() => setPhase("slow"), 3000);
    const t2 = setTimeout(() => setPhase("stuck"), 9000);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "hidden") return null;

  const handleRetry = () => {
    window.location.reload();
  };

  if (phase === "stuck") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-lg animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            {navigator.onLine ? (
              <AlertTriangle className="w-7 h-7 text-destructive" />
            ) : (
              <WifiOff className="w-7 h-7 text-destructive" />
            )}
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {navigator.onLine ? "Le chargement prend trop de temps" : "Connexion internet perdue"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {navigator.onLine
                ? "Vérifiez votre connexion ou réessayez. Si le problème persiste, revenez dans quelques instants."
                : "Connectez-vous à internet, puis réessayez."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={handleRetry} className="flex-1 gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="flex-1"
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 animate-in fade-in duration-200 px-4">
      <div className="relative">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-primary/20 animate-ping" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground animate-pulse">
          {phase === "slow" ? "Chargement plus long que prévu…" : "Chargement…"}
        </p>
        {phase === "slow" && (
          <p className="text-xs text-muted-foreground/70">
            Connexion lente détectée, merci de patienter
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Error boundary qui capture les échecs de chargement de chunk lazy.
 * Au retry, on remonte une `key` pour forcer React à re-monter l'arbre
 * et réessayer l'import dynamique SANS full reload de la page.
 * Si l'échec est un "Failed to fetch dynamically imported module" persistant
 * (déploiement avec hash de chunk obsolète), on tente alors un soft reload.
 */
class ChunkErrorBoundary extends Component<
  { children: ReactNode; resetKey: number; onReset: () => void },
  { hasError: boolean; error?: Error; retryCount: number }
> {
  constructor(props: { children: ReactNode; resetKey: number; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SmartSuspense] Chunk load error:", error, info);
  }

  handleRetry = () => {
    const isChunkError =
      this.state.error?.message?.includes("dynamically imported module") ||
      this.state.error?.message?.includes("Loading chunk") ||
      this.state.error?.name === "ChunkLoadError";

    // Après 2 échecs sur un chunk, on force un reload (déploiement obsolète)
    if (isChunkError && this.state.retryCount >= 1) {
      window.location.reload();
      return;
    }

    this.setState((s) => ({ hasError: false, error: undefined, retryCount: s.retryCount + 1 }));
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-lg animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Échec du chargement
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Une erreur s'est produite pendant le chargement du composant.
                {this.state.retryCount > 0 && " Tentative précédente échouée."}
              </p>
            </div>
            <Button onClick={this.handleRetry} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer sans recharger
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Wrapper combinant Suspense + ErrorBoundary + détection de lenteur + retry doux */
export const SmartSuspense = ({ children }: { children: ReactNode }) => {
  const [resetKey, setResetKey] = useState(0);
  return (
    <ChunkErrorBoundary resetKey={resetKey} onReset={() => setResetKey((k) => k + 1)}>
      <Suspense key={resetKey} fallback={<SmartLoader />}>
        {children}
      </Suspense>
    </ChunkErrorBoundary>
  );
};

export default SmartSuspense;
