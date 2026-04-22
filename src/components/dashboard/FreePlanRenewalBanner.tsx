import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, RefreshCw, Crown, AlertTriangle } from "lucide-react";
import { useFreePlanStatus } from "@/hooks/useFreePlanStatus";
import { toast } from "sonner";

interface FreePlanRenewalBannerProps {
  userId?: string | null;
}

/**
 * Affiche au fournisseur en plan gratuit :
 * - le nombre de jours restants
 * - le nombre de renouvellements restants (max 2)
 * - un bouton de renouvellement si applicable
 * - un blocage clair si tout est épuisé (1 mois + 2 renouvellements)
 */
const FreePlanRenewalBanner = ({ userId }: FreePlanRenewalBannerProps) => {
  const { status, loading, renew } = useFreePlanStatus(userId);
  const [renewing, setRenewing] = useState(false);

  if (loading || !status?.exists || status.plan !== "free") return null;

  const daysLeft = status.expires_at
    ? Math.max(0, Math.ceil((new Date(status.expires_at).getTime() - Date.now()) / 86400000))
    : 0;
  const renewalsRemaining = status.renewals_remaining ?? 0;
  const isExpired = !!status.is_expired;
  const isBlocked = isExpired && renewalsRemaining === 0;

  const handleRenew = async () => {
    setRenewing(true);
    const result = await renew();
    setRenewing(false);
    if (result.success) {
      toast.success(`Plan prolongé de 30 jours. ${result.renewals_remaining} renouvellement(s) restant(s).`);
    } else {
      toast.error(result.error === "max_renewals_reached" ? "Limite de renouvellements atteinte" : "Erreur lors du renouvellement");
    }
  };

  // Cas blocage total
  if (isBlocked) {
    return (
      <Card className="mb-4 sm:mb-6 border-destructive/40 bg-destructive/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-heading text-sm font-bold text-foreground">Plan gratuit épuisé</h3>
                <Badge variant="destructive" className="text-[9px]">Publication bloquée</Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-3">
                Vous avez utilisé votre mois gratuit + vos 2 renouvellements. Vos produits sont désactivés
                tant qu'aucun plan payant n'est souscrit. Passez à Starter, Standard ou Premium pour réactiver
                votre catalogue et continuer à publier.
              </p>
              <Link to="/plans">
                <Button variant="hero" size="sm" className="gap-1.5 text-xs">
                  <Crown className="w-3.5 h-3.5" /> Passer à un plan payant
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cas normal : compteur + renouvellement possible
  return (
    <Card className="mb-4 sm:mb-6 border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-heading text-xs sm:text-sm font-semibold text-foreground">Plan gratuit actif</h3>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[9px]">
                  {daysLeft}j restants
                </Badge>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                Renouvellements gratuits restants : <strong>{renewalsRemaining}/2</strong>
                {renewalsRemaining === 0 && " — pensez à passer à un plan payant"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isExpired && renewalsRemaining > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-[11px] h-8 border-amber-500/40"
                onClick={handleRenew}
                disabled={renewing}
              >
                {renewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Renouveler 30j
              </Button>
            )}
            <Link to="/plans">
              <Button variant="hero" size="sm" className="gap-1.5 text-[11px] h-8">
                <Crown className="w-3.5 h-3.5" /> Premium
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FreePlanRenewalBanner;
