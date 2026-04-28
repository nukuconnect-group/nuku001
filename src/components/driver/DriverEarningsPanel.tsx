import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, ArrowDownToLine, History, Loader2, TrendingUp } from "lucide-react";

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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onWithdraw(parseFloat(amount), phone, operator);
      setAmount("");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Numéro</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || availableBalance <= 0}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
            Retirer
          </Button>
        </CardContent>
      </Card>

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" /> Historique retraits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-2">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{w.amount.toLocaleString("en-US")} F</p>
                  <p className="text-[10px] text-muted-foreground">
                    {w.operator === "flooz" ? "Moov" : "T-Money"} • {new Date(w.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Badge className={
                  w.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                  w.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                }>
                  {w.status === "completed" ? "Effectué" : w.status === "pending" ? "En attente" : "Refusé"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DriverEarningsPanel;
