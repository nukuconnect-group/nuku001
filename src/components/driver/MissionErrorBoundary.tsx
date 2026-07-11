import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  onBack: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Boundary local pour l'écran de mission livreur.
 * Empêche le SmartSuspense global (« Chargement interrompu ») de se déclencher
 * et affiche un vrai bouton "Retour au tableau de bord".
 */
export default class MissionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[MissionErrorBoundary]", error, info);
  }

  handleBack = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onBack();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 text-center space-y-4 shadow-lg">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Impossible d'ouvrir la mission</h2>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message || "Une erreur est survenue lors du chargement de la carte."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={this.handleBack}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button className="flex-1" onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
