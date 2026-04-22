import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTokens } from "@/hooks/useTokens";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Zap, Star, Rocket, ArrowRight, Loader2, CreditCard, Coins, Calendar } from "lucide-react";

// Mapping pack code -> display
const packDetails: Record<string, { name: string; icon: any; color: string; tier: string }> = {
  starter:  { name: "Starter",  icon: Star,   color: "bg-primary",       tier: "Débutant" },
  standard: { name: "Standard", icon: Rocket, color: "bg-gradient-hero", tier: "Pro" },
  premium:  { name: "Premium",  icon: Crown,  color: "bg-accent",        tier: "Entreprise" },
};

const SubscriptionCard = () => {
  const navigate = useNavigate();
  const { balance, purchases, loading } = useTokens();
  const { subscription } = useSubscription();

  // Détecte le pack actif courant : achat le plus récent non expiré
  const activePurchase = purchases.find(p => p.payment_status === "completed" && new Date(p.expires_at) > new Date());
  const activePack = activePurchase ? packDetails[activePurchase.pack_code] || packDetails.starter : null;
  const PlanIcon = activePack?.icon || Zap;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isFreeOnly = !activePack;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-5 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Mon abonnement
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs mt-1">
              Pack actuel basé sur vos crédits
            </CardDescription>
          </div>
          <Link to="/plans">
            <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 gap-1">
              Tous les plans <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-5 space-y-4">
        {/* Current pack */}
        {activePack && activePurchase ? (
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/50 rounded-xl">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${activePack.color} flex items-center justify-center flex-shrink-0`}>
              <PlanIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-bold text-sm sm:text-lg text-foreground">
                  Pack {activePack.name}
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] sm:text-[10px]">
                  Actif
                </Badge>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Coins className="w-3 h-3" /> {balance} crédit{balance > 1 ? "s" : ""} restant{balance > 1 ? "s" : ""}
                <span className="text-border">•</span>
                <Calendar className="w-3 h-3" /> Expire le {new Date(activePurchase.expires_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/50 rounded-xl">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-heading font-bold text-sm sm:text-lg text-foreground">Plan Gratuit</span>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {subscription?.max_products || 5} produits max • Achetez un pack pour booster
              </p>
            </div>
          </div>
        )}

        {/* Upgrade options */}
        {isFreeOnly && (
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Choisir un pack :</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["starter", "standard", "premium"] as const).map((code) => {
                const p = packDetails[code];
                const Icon = p.icon;
                return (
                  <button
                    key={code}
                    onClick={() => navigate("/jetons")}
                    className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-primary/15 hover:border-primary/50 transition-all text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground">Pack {p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.tier}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* History — uses real token purchases */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            Historique d'achats de packs
          </h4>
          <div className="space-y-1.5">
            {purchases.length > 0 ? (
              purchases.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      Pack {packDetails[p.pack_code]?.name || p.pack_code} — {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] sm:text-xs font-medium">{Number(p.price_fcfa).toLocaleString()} FCFA</span>
                    <Badge className={`text-[9px] ${
                      p.payment_status === "completed" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                    }`}>
                      {p.payment_status === "completed" ? "Payé" : "En attente"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-2">
                Aucun achat de pack pour le moment
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;
