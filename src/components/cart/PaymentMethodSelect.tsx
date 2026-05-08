import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { openMonerooPay } from "@/lib/moneroo";

const paymentMethods = [
  { id: "moneroo", name: "Moneroo", description: "Mobile Money, Visa, Mastercard", icon: Wallet, tag: "Recommandé" },
];
export { paymentMethods };

// Keep these exports for backward compat
export const detectNetworkFromPhone = (_raw: string): "FLOOZ" | "TMONEY" | "" => "";
export const validateMobileMoneyPhone = (_raw: string): { valid: boolean; reason?: string; network?: "FLOOZ" | "TMONEY" } => ({ valid: true });

interface PaymentMethodSelectProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  mobileNumber: string;
  onMobileNumberChange: (number: string) => void;
  amount?: number;
  onPaymentSuccess?: (transactionId: string) => void;
  hidePayButton?: boolean;
  isPolling?: boolean;
  onNetworkChange?: (network: string) => void;
}

const PaymentMethodSelect = ({
  amount,
  onPaymentSuccess,
  hidePayButton = false,
  isPolling = false,
}: PaymentMethodSelectProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePay = useCallback(() => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    openMonerooPay({
      amount,
      description: `Commande NUKUCONNECT - ${amount} FCFA`,
      context: "direct",
      contextData: {},
      onError: (msg) => {
        setIsProcessing(false);
        toast({ title: "❌ Paiement échoué", description: msg, variant: "destructive" });
      },
    });
  }, [amount, toast]);

  const showPolling = hidePayButton ? isPolling : false;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Wallet className="w-5 h-5 text-primary" />
          Mode de paiement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-foreground">Moneroo</p>
                <Badge className="text-[9px] bg-primary/20 text-primary border-0">Sécurisé</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Mobile Money • Visa • Mastercard</p>
            </div>
          </div>

          {showPolling && (
            <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-medium text-foreground">Vérification du paiement en cours...</span>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Transaction chiffrée et sécurisée via Moneroo
          </p>
        </div>

        {!hidePayButton && amount && amount > 0 && (
          <Button
            variant="hero"
            className="w-full gap-2"
            onClick={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isProcessing ? "Redirection..." : `Payer ${amount.toLocaleString("fr-FR")} FCFA`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelect;
