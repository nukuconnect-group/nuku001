import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Crown, Zap, Star, Rocket, ArrowRight, Check, Loader2, Calendar, CreditCard } from "lucide-react";

const planDetails: Record<string, { name: string; icon: any; color: string; maxProducts: number }> = {
  free: { name: "Gratuit", icon: Zap, color: "bg-muted", maxProducts: 3 },
  pro: { name: "Pro", icon: Star, color: "bg-primary", maxProducts: 15 },
  business: { name: "Business", icon: Rocket, color: "bg-gradient-hero", maxProducts: 9999 },
  enterprise: { name: "Entreprise", icon: Crown, color: "bg-accent", maxProducts: 9999 },
};

const SubscriptionCard = () => {
  const { subscription, isLoading, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const plan = subscription ? planDetails[subscription.plan] || planDetails.free : null;
  const PlanIcon = plan?.icon || Zap;

  const handleQuickUpgrade = async (planId: string, _maxProducts: number) => {
    toast({
      title: "Paiement requis",
      description: `Finalisez le paiement du plan ${planDetails[planId]?.name || planId} depuis la page des tarifs.`,
    });
    navigate("/plans");
  };

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
              Gérez votre plan d'adhésion
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
        {/* Current plan */}
        {subscription ? (
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/50 rounded-xl">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${plan?.color} flex items-center justify-center flex-shrink-0`}>
              <PlanIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm sm:text-lg text-foreground">
                  Plan {plan?.name}
                </span>
                <Badge className="bg-green-500/20 text-green-600 text-[9px] sm:text-[10px]">
                  {subscription.status === "active" ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {subscription.max_products >= 9999 ? "Produits illimités" : `${subscription.max_products} produits max`}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Zap className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">Aucun abonnement actif</p>
            <Button variant="hero" size="sm" className="gap-1 text-xs" onClick={() => navigate("/plans")}>
              <Crown className="w-3.5 h-3.5" /> Choisir un plan
            </Button>
          </div>
        )}

        {/* Quick upgrade options */}
        {subscription && subscription.plan !== "business" && (
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Évoluer vers :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subscription.plan === "free" && (
                <button
                  onClick={() => handleQuickUpgrade("pro", 15)}
                  disabled={upgrading}
                  className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border-2 border-primary/20 hover:border-primary/50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground">Plan Pro</p>
                    <p className="text-[10px] text-muted-foreground">5 000 FCFA/mois • 15 produits</p>
                  </div>
                </button>
              )}
              <button
                onClick={() => handleQuickUpgrade("business", 9999)}
                disabled={upgrading}
                className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border-2 border-accent/20 hover:border-accent/50 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground">Plan Business</p>
                  <p className="text-[10px] text-muted-foreground">15 000 FCFA/mois • Illimité</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Payment History placeholder */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            Historique des paiements
          </h4>
          <div className="space-y-1.5">
            {subscription && subscription.plan !== "free" ? (
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-medium">
                    {subscription.plan === "pro" ? "5 000" : "15 000"} FCFA
                  </span>
                  <Badge className="bg-green-500/20 text-green-600 text-[9px]">Payé</Badge>
                </div>
              </div>
            ) : (
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-2">
                Aucun paiement — plan gratuit actif
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;
