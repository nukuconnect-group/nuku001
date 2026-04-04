import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Phone, Send, Loader2, Clock, CheckCircle, XCircle, Banknote } from "lucide-react";

const OPERATORS = [
  { value: "flooz", label: "Flooz (Moov)", color: "bg-blue-500" },
  { value: "tmoney", label: "T-Money (Togocel)", color: "bg-yellow-500" },
  { value: "wave", label: "Wave", color: "bg-indigo-500" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
  pending: { label: "En attente", variant: "secondary", icon: Clock },
  approved: { label: "Approuvé", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejeté", variant: "destructive", icon: XCircle },
  completed: { label: "Envoyé", variant: "default", icon: CheckCircle },
};

const WithdrawalPanel = () => {
  const { user, profile } = useProfile();
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [operator, setOperator] = useState("flooz");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;
    fetchData();
  }, [user, profile]);

  const fetchData = async () => {
    if (!user || !profile) return;
    setIsLoading(true);

    // Fetch withdrawals
    const { data: wData } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWithdrawals(wData || []);

    // Calculate total earnings from completed orders
    const { data: orderData } = await supabase
      .from("orders")
      .select("total_price, status")
      .eq("seller_id", profile.id);

    const earnings = (orderData || [])
      .filter((o: any) => o.status === "completed" || o.status === "delivered")
      .reduce((sum: number, o: any) => sum + (Number(o.total_price) || 0), 0);
    setTotalEarnings(earnings);

    const withdrawn = (wData || [])
      .filter((w: any) => w.status !== "rejected")
      .reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0);
    setTotalWithdrawn(withdrawn);

    setIsLoading(false);
  };

  const availableBalance = totalEarnings - totalWithdrawn;

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 500) {
      toast({ title: "Montant minimum : 500 FCFA", variant: "destructive" });
      return;
    }
    if (numAmount > availableBalance) {
      toast({ title: "Solde insuffisant", variant: "destructive" });
      return;
    }
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({ title: "Numéro de téléphone invalide", variant: "destructive" });
      return;
    }
    if (!user || !profile) return;

    setIsSubmitting(true);
    const { data: result, error } = await supabase.functions.invoke("create-withdrawal", {
      body: {
        amount: numAmount,
        operator,
        phone_number: phoneNumber,
      },
    });

    const fnError = error || (result?.error ? { message: result.error } : null);

    if (error) {
      toast({ title: "Erreur lors de la demande", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Demande envoyée ✅", description: "Votre demande de retrait sera traitée sous 24-48h" });
      setAmount("");
      setPhoneNumber("");
      fetchData();
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-primary" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Gains totaux</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">{totalEarnings.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Déjà retiré</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">{totalWithdrawn.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-green-600" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Solde disponible</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-600">{availableBalance.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Form */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Demander un retrait
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            Minimum 500 FCFA · Traitement sous 24-48h
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Montant (FCFA)</label>
              <Input
                type="number"
                placeholder="Ex: 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={500}
                max={availableBalance}
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Opérateur</label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Numéro Mobile Money</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Ex: 90123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting || availableBalance < 500} className="w-full sm:w-auto gap-2 text-xs h-9">
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Envoyer la demande
          </Button>
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm">Historique des retraits</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {withdrawals.length > 0 ? (
            <div className="space-y-2">
              {withdrawals.map((w) => {
                const st = STATUS_MAP[w.status] || STATUS_MAP.pending;
                const Icon = st.icon;
                const op = OPERATORS.find((o) => o.value === w.operator);
                return (
                  <div key={w.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${op?.color || "bg-muted"} text-white text-[10px] font-bold flex-shrink-0`}>
                        {op?.label.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{Number(w.amount).toLocaleString()} FCFA</p>
                        <p className="text-[9px] text-muted-foreground">{op?.label} · {w.phone_number}</p>
                        <p className="text-[9px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={st.variant} className="text-[9px] gap-1">
                        <Icon className="w-2.5 h-2.5" />{st.label}
                      </Badge>
                      {w.admin_note && <span className="text-[8px] text-muted-foreground max-w-[120px] truncate">{w.admin_note}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Wallet className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Aucun retrait effectué</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalPanel;
