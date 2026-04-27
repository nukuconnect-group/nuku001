import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTokens } from "@/hooks/useTokens";
import { useProfile } from "@/contexts/ProfileContext";
import { Rocket, Coins, Check, Loader2, Clock, Sparkles, HandCoins } from "lucide-react";

/**
 * Boost de besoin : réutilise EXACTEMENT les mêmes plans que ProductBoostModal
 * (1 crédit / 7 jours et 4 crédits / 30 jours) pour cohérence avec
 * "les vrais plans d'origine" déjà utilisés partout dans l'app.
 */
interface BoostPlan {
  id: string;
  name: string;
  days: number;
  tokens: number;
  features: string[];
  popular?: boolean;
}

const boostPlans: BoostPlan[] = [
  { id: "basic",    name: "Boost 7 jours",  days: 7,  tokens: 1, features: ["Mise en avant 7 jours", "Badge « En vedette »", "Position prioritaire", "1 crédit utilisé"] },
  { id: "standard", name: "Boost 30 jours", days: 30, tokens: 4, features: ["Mise en avant 30 jours", "Badge « Top Demande »", "Notifié aux fournisseurs", "4 crédits utilisés"], popular: true },
];

interface DemandBoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoostSuccess?: () => void;
  presetDemandId?: string;
  presetDemand?: { id: string; title: string; category: string };
}

interface DemandLite { id: string; title: string; category: string; }

const DemandBoostModal = ({ open, onOpenChange, onBoostSuccess, presetDemandId, presetDemand }: DemandBoostModalProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { balance, spendTokens, loading: balanceLoading, refresh } = useTokens();
  const [selectedPlan, setSelectedPlan] = useState<string>("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [demands, setDemands] = useState<DemandLite[]>([]);
  const [selectedDemand, setSelectedDemand] = useState<string>("");
  const [loadingDemands, setLoadingDemands] = useState(false);

  useEffect(() => {
    if (!open || !profile?.id) return;
    setLoadingDemands(true);
    supabase
      .from("demands")
      .select("id,title,category")
      .eq("profile_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        let list = (data || []) as DemandLite[];
        if (presetDemand && !list.find((d) => d.id === presetDemand.id)) {
          list = [presetDemand, ...list];
        }
        setDemands(list);
        const target = presetDemandId || presetDemand?.id || (list[0]?.id ?? "");
        setSelectedDemand(target);
        setLoadingDemands(false);
      });
  }, [open, profile?.id, presetDemandId, presetDemand?.id]);

  const handleBoost = async () => {
    if (!selectedDemand) {
      toast({ title: "Sélectionnez un besoin", description: "Choisissez l'un de vos besoins à booster.", variant: "destructive" });
      return;
    }
    const plan = boostPlans.find(p => p.id === selectedPlan);
    const demand = demands.find(d => d.id === selectedDemand);
    if (!plan || !demand) return;

    if (balance < plan.tokens) {
      toast({ title: "Solde insuffisant", description: `Il vous faut ${plan.tokens} crédit${plan.tokens > 1 ? "s" : ""}.`, variant: "destructive" });
      onOpenChange(false);
      navigate("/jetons");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const spent = await spendTokens(plan.tokens, `Boost besoin "${demand.title}" (${plan.days}j)`, demand.id, "demand_boost");
      if (!spent.success) throw new Error(spent.error === "insufficient_tokens" ? "Solde de jetons insuffisant" : (spent.error || "Échec débit jetons"));

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.days);
      const { error } = await supabase
        .from("demands")
        .update({ is_boosted: true, boosted_until: expiresAt.toISOString() } as any)
        .eq("id", demand.id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: session.user.id,
        type: "tokens",
        title: `🚀 Besoin boosté`,
        description: `"${demand.title}" mis en avant ${plan.days} jours. ${plan.tokens} crédit${plan.tokens > 1 ? "s" : ""} utilisé${plan.tokens > 1 ? "s" : ""}. Solde restant : ${balance - plan.tokens}.`,
      });

      toast({ title: "🚀 Besoin boosté !", description: `"${demand.title}" en vedette pour ${plan.days} jours.` });
      await refresh();
      onOpenChange(false);
      onBoostSuccess?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlan = boostPlans.find(p => p.id === selectedPlan)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-base sm:text-lg flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" /> Booster un besoin
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Mettez votre besoin en avant pour attirer plus de fournisseurs.
          </p>
        </DialogHeader>

        {/* Solde */}
        <div className="rounded-xl bg-gradient-hero text-primary-foreground p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            <div>
              <p className="text-[10px] opacity-90">Votre solde</p>
              <p className="font-heading text-lg font-bold">{balanceLoading ? "…" : balance} crédit{balance > 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => { onOpenChange(false); navigate("/jetons"); }}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Recharger
          </Button>
        </div>

        {/* Sélection du besoin */}
        <div className="space-y-2">
          <label className="text-xs font-semibold flex items-center gap-1.5">
            <HandCoins className="w-3.5 h-3.5 text-primary" /> Choisir un besoin à booster
          </label>
          {loadingDemands ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…</div>
          ) : demands.length === 0 ? (
            <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              Vous n'avez pas encore de besoin actif. Publiez d'abord un besoin via « Que recherchez-vous ? ».
            </div>
          ) : (
            <Select value={selectedDemand} onValueChange={setSelectedDemand}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un besoin" /></SelectTrigger>
              <SelectContent>
                {demands.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title} <span className="text-muted-foreground">— {d.category}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Plans */}
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
                        <span className="text-[10px] text-muted-foreground">crédit{plan.tokens > 1 ? "s" : ""}</span>
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
              {currentPlan.name} — {currentPlan.tokens} crédit{currentPlan.tokens > 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={handleBoost} disabled={isLoading || demands.length === 0}>
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            Booster
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemandBoostModal;
