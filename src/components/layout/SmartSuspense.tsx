import { Suspense, useEffect, useState, ReactNode, Component, ErrorInfo } from "react";
import { Loader2, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logClientDiag } from "@/lib/clientDiagnostics";

/**
 * Loader avec détection de lenteur :
 * - 0-2s : spinner simple
 * - 2-8s : message "chargement plus long que prévu"
 * - >8s  : UI de récupération avec bouton "Réessayer"
 */
const SmartLoader = () => {
  const [phase, setPhase] = useState<"hidden" | "loading" | "slow" | "stuck">("hidden");

  useEffect(() => {
    // Pas de loader avant 500ms : navigation instantanée perçue
    const t0 = setTimeout(() => setPhase("loading"), 500);
    // Seuils plus tolérants pour éviter les messages "trop long" intempestifs
    const t1 = setTimeout(() => setPhase("slow"), 6000);
    const t2 = setTimeout(() => setPhase("stuck"), 18000);
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

  // Loader moderne centré au milieu de la page (plus de pastille en haut)
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <Loader2 className="w-12 h-12 absolute inset-0 animate-spin text-primary" strokeWidth={1.5} />
        </div>
        {phase === "slow" && (
          <span className="text-xs text-muted-foreground">Chargement en cours…</span>
        )}
      </div>
    </div>
  );
};

const RELOAD_GUARD_KEY = "nk_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(error?: Error | null) {
  if (!error) return false;
  const msg = error.message || "";
  return (
    msg.includes("dynamically imported module") ||
    msg.includes("Failed to fetch dynamically imported") ||
    msg.includes("Loading chunk") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    error.name === "ChunkLoadError"
  );
}

function tryAutoReloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || "0");
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    // Hard reload bypassing the bf-cache & stale chunk URLs.
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

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
    try {
      logClientDiag(isChunkLoadError(error) ? "chunk" : "generic", error?.message || "Route render error", {
        level: "error",
        meta: {
          page: typeof location !== "undefined" ? location.pathname : "",
          componentStack: info.componentStack?.slice(0, 500),
        },
      });
    } catch { /* noop */ }
    // Stale chunk hashes after a deploy = auto-reload immediately (once per 30s).
    if (isChunkLoadError(error)) {
      if (tryAutoReloadOnce()) return;
    }
  }

  handleRetry = () => {
    if (isChunkLoadError(this.state.error)) {
      // Forcer un rechargement complet pour récupérer les nouveaux chunks.
      try { sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch { /* noop */ }
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
                Chargement interrompu
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Réessayez pour reprendre l'ouverture de cette page.
                {this.state.retryCount > 0 && " Tentative précédente échouée."}
              </p>
            </div>
            <Button onClick={this.handleRetry} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
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
