import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, ArrowDownToLine, History, Loader2, TrendingUp, Clock, CheckCircle2, XCircle, CalendarDays } from "lucide-react";

interface DriverEarningsPanelProps {
  totalEarnings: number;
  totalWithdrawn: number;
  availableBalance: number;
  todayEarnings: number;
  weekEarnings: number;
  completedCount: number;
  withdrawals: any[];
  onWithdraw: (amount: number, phone: string, operator: string) => Promise<void>;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Approuvé", icon: CheckCircle2, className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Envoyé ✅", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected: { label: "Refusé", icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const OPERATORS: Record<string, string> = {
  flooz: "Moov Money",
  tmoney: "T-Money",
  wave: "Wave",
};

const DriverEarningsPanel = ({
  totalEarnings,
  totalWithdrawn,
  availableBalance,
  todayEarnings,
  weekEarnings,
  completedCount,
  withdrawals,
  onWithdraw,
}: DriverEarningsPanelProps) => {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState("flooz");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onWithdraw(parseFloat(amount), phone, operator);
      setAmount("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleWithdrawals = showAllHistory ? withdrawals : withdrawals.slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Balance card */}
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
        <CardContent className="p-4 space-y-3">
          <div className="text-center">
            <p className="text-xs text-emerald-100">Solde disponible</p>
            <p className="text-3xl font-bold">{availableBalance.toLocaleString("en-US")} F</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-sm font-bold">{todayEarnings.toLocaleString("en-US")} F</p>
              <p className="text-[9px] text-emerald-100">Aujourd'hui</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-sm font-bold">{weekEarnings.toLocaleString("en-US")} F</p>
              <p className="text-[9px] text-emerald-100">Cette semaine</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-sm font-bold">{completedCount}</p>
              <p className="text-[9px] text-emerald-100">Livraisons</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
          <p className="text-sm font-bold">{totalEarnings.toLocaleString("en-US")} F</p>
          <p className="text-[9px] text-muted-foreground">Total gagné</p>
        </Card>
        <Card className="p-3 text-center">
          <ArrowDownToLine className="w-4 h-4 mx-auto text-blue-500 mb-1" />
          <p className="text-sm font-bold">{totalWithdrawn.toLocaleString("en-US")} F</p>
          <p className="text-[9px] text-muted-foreground">Total retiré</p>
        </Card>
      </div>

      {/* Withdrawal form */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" /> Demander un retrait
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1 space-y-2.5">
          <div>
            <Label className="text-xs">Montant (FCFA)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Max: ${availableBalance.toLocaleString("en-US")}`} />
          </div>
          <div>
            <Label className="text-xs">Opérateur</Label>
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flooz">Moov Money / Flooz</SelectItem>
                <SelectItem value="tmoney">T-Money</SelectItem>
                <SelectItem value="wave">Wave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Numéro de réception</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || availableBalance <= 0}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
            Soumettre la demande
          </Button>
        </CardContent>
      </Card>

      {/* Detailed withdrawal history */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4" /> Historique des retraits ({withdrawals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1 space-y-2">
          {withdrawals.length === 0 ? (
            <div className="text-center py-4">
              <Wallet className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Aucun retrait effectué</p>
            </div>
          ) : (
            <>
              {visibleWithdrawals.map((w: any) => {
                const config = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                return (
                  <div key={w.id} className="p-2.5 rounded-xl bg-muted/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${config.className}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{Number(w.amount).toLocaleString("en-US")} FCFA</p>
                          <p className="text-[10px] text-muted-foreground">
                            {OPERATORS[w.operator] || w.operator} • {w.phone_number}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-[9px] ${config.className} border-0`}>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground pl-9">
                      <span className="flex items-center gap-0.5">
                        <CalendarDays className="w-2.5 h-2.5" />
                        Demandé: {new Date(w.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {w.processed_at && (
                        <span>
                          Traité: {new Date(w.processed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {w.admin_note && (
                      <p className="text-[10px] text-muted-foreground pl-9 italic">
                        💬 {w.admin_note}
                      </p>
                    )}
                  </div>
                );
              })}
              {withdrawals.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAllHistory(!showAllHistory)}>
                  {showAllHistory ? "Voir moins" : `Voir tout (${withdrawals.length})`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverEarningsPanel;
