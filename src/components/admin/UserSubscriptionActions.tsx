import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Crown, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  userName?: string;
  currentPlan?: string;
  onUpdated?: () => void;
}

const PLAN_OPTIONS = [
  { value: "free", label: "Gratuit (3 produits)" },
  { value: "pro", label: "Pro (50 produits + 100 jetons)" },
  { value: "premium", label: "Premium (200 produits + 500 jetons)" },
  { value: "business", label: "Business (1000 produits + 2000 jetons)" },
];

export default function UserSubscriptionActions({ userId, userName, currentPlan, onUpdated }: Props) {
  const { toast } = useToast();
  const [openSub, setOpenSub] = useState(false);
  const [openCredit, setOpenCredit] = useState(false);
  const [plan, setPlan] = useState(currentPlan || "pro");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [duration, setDuration] = useState(30);
  const [credit, setCredit] = useState(50);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const applySub = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_set_user_subscription" as any, {
      p_user_id: userId,
      p_plan: plan,
      p_billing_period: billing,
      p_duration_days: duration,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Abonnement mis à jour",
      description: `Plan ${plan} attribué à ${userName || "l'utilisateur"}.`,
    });
    setOpenSub(false);
    onUpdated?.();
  };

  const applyCredit = async () => {
    if (credit <= 0) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_credit_tokens" as any, {
      p_user_id: userId,
      p_amount: credit,
      p_reason: reason || "admin_grant",
    });
    setBusy(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Jetons crédités", description: `+${credit} jetons attribués.` });
    setOpenCredit(false);
    onUpdated?.();
  };

  return (
    <>
      <div className="flex gap-1.5 justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] gap-1"
          onClick={() => setOpenSub(true)}
        >
          <Crown className="w-3 h-3" /> Abonnement
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] gap-1"
          onClick={() => setOpenCredit(true)}
        >
          <Coins className="w-3 h-3" /> Jetons
        </Button>
      </div>

      {/* Subscription dialog */}
      <Dialog open={openSub} onOpenChange={setOpenSub}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Attribuer un abonnement</DialogTitle>
            <DialogDescription className="text-xs">
              {userName} — Cette action remplace le plan actuel et offre les jetons bonus du pack.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Période</Label>
                <Select value={billing} onValueChange={(v) => setBilling(v as any)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly" className="text-xs">Mensuel</SelectItem>
                    <SelectItem value="yearly" className="text-xs">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Durée (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenSub(false)} disabled={busy}>Annuler</Button>
            <Button variant="hero" size="sm" onClick={applySub} disabled={busy} className="gap-1">
              {busy && <Loader2 className="w-3 h-3 animate-spin" />} Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit tokens dialog */}
      <Dialog open={openCredit} onOpenChange={setOpenCredit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Créditer des jetons</DialogTitle>
            <DialogDescription className="text-xs">
              {userName} — Les jetons sont valables 365 jours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Quantité</Label>
              <Input
                type="number"
                min={1}
                value={credit}
                onChange={(e) => setCredit(parseInt(e.target.value) || 0)}
                className="h-9 text-xs"
              />
              <div className="flex gap-1 mt-1.5">
                {[10, 50, 100, 500].map((v) => (
                  <Button key={v} size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setCredit(v)}>+{v}</Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Raison (optionnel)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: compensation, promotion..."
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenCredit(false)} disabled={busy}>Annuler</Button>
            <Button variant="hero" size="sm" onClick={applyCredit} disabled={busy || credit <= 0} className="gap-1">
              {busy && <Loader2 className="w-3 h-3 animate-spin" />} Créditer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
