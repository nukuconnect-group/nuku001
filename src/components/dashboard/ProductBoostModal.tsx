import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTokens } from "@/hooks/useTokens";
import { Rocket, Coins, Check, Loader2, Clock, Sparkles } from "lucide-react";

interface BoostPlan {
  id: string;
  name: string;
  days: number;
  tokens: number;
  features: string[];
  popular?: boolean;
}

const boostPlans: BoostPlan[] = [
  { id: "basic",    name: "Boost 7 jours",  days: 7,  tokens: 1, features: ["Mise en avant 7 jours", "Badge « En vedette »", "Position prioritaire"] },
  { id: "standard", name: "Boost 30 jours", days: 30, tokens: 1, features: ["Mise en avant 30 jours", "Badge « Top Produit »", "Affiché sur l'accueil", "Notification aux acheteurs"], popular: true },
];

interface ProductBoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; name: string; images?: string[] } | null;
  onBoostSuccess?: () => void;
}

const ProductBoostModal = ({ open, onOpenChange, product, onBoostSuccess }: ProductBoostModalProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { balance, spendTokens, loading: balanceLoading } = useTokens();
  const [selectedPlan, setSelectedPlan] = useState<string>("standard");
  const [isLoading, setIsLoading] = useState(false);

  const handleBoost = async () => {
    if (!product) return;
    const plan = boostPlans.find(p => p.id === selectedPlan);
    if (!plan) return;

    if (balance < plan.tokens) {
      toast({ title: "Solde insuffisant", description: `Il vous faut ${plan.tokens} jeton. Achetez-en pour continuer.`, variant: "destructive" });
      onOpenChange(false);
      navigate("/jetons");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      // 1) Débit jetons
      const spent = await spendTokens(plan.tokens, `Boost "${product.name}" (${plan.days}j)`, product.id, "product_boost");
      if (!spent.success) throw new Error(spent.error === "insufficient_tokens" ? "Solde de jetons insuffisant" : (spent.error || "Échec débit jetons"));

      // 2) Création boost
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.days);
      const { error } = await supabase.from("product_boosts").insert({
        product_id: product.id,
        user_id: session.user.id,
        plan_name: plan.id,
        days: plan.days,
        price: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });
      if (error) throw error;

      toast({ title: "🚀 Produit boosté !", description: `"${product.name}" en vedette pour ${plan.days} jours. ${plan.tokens} jeton consommé.` });
      onOpenChange(false);
      onBoostSuccess?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-base sm:text-lg flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" /> Booster votre produit
          </DialogTitle>
          {product && (
            <p className="text-xs text-muted-foreground mt-1">
              Mettez en avant <span className="font-semibold text-foreground">"{product.name}"</span> avec vos jetons
            </p>
          )}
        </DialogHeader>

        {/* Solde jetons */}
        <div className="rounded-xl bg-gradient-hero text-primary-foreground p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            <div>
              <p className="text-[10px] opacity-90">Votre solde</p>
              <p className="font-heading text-lg font-bold">{balanceLoading ? "…" : balance} jetons</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => { onOpenChange(false); navigate("/jetons"); }}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Recharger
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {boostPlans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all duration-200 relative ${isSelected ? "ring-2 ring-primary shadow-elevated" : "hover:shadow-soft hover:border-primary/30"}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-2">Populaire</Badge>
                )}
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-xs sm:text-sm font-semibold">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <Coins className="w-3.5 h-3.5 text-primary" />
                        <span className="font-heading text-lg font-bold text-primary">{plan.tokens}</span>
                        <span className="text-[10px] text-muted-foreground">jeton{plan.tokens > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{plan.days} jours</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />{feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground">Plan sélectionné</p>
            <p className="font-heading text-sm font-bold">
              {boostPlans.find(p => p.id === selectedPlan)?.name} — {boostPlans.find(p => p.id === selectedPlan)?.tokens} jeton
            </p>
          </div>
          <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={handleBoost} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            Booster
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductBoostModal;
