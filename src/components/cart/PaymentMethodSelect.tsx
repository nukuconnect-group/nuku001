import { useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    openKkiapayWidget: (config: any) => void;
    addKkiapayListener: (event: string, callback: (data: any) => void) => void;
    removeKkiapayListener: (event: string, callback: (data: any) => void) => void;
  }
}

const KKIAPAY_PUBLIC_KEY = "7ff92c1a22c93addfdc25cec653a1a3e20e0258c";

// Keep export for backward compat
const paymentMethods = [
  { id: "kkiapay", name: "KKiaPay", description: "Mobile Money, Visa, Mastercard", icon: Wallet, tag: "Recommandé" },
];
export { paymentMethods };

interface PaymentMethodSelectProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  mobileNumber: string;
  onMobileNumberChange: (number: string) => void;
  amount?: number;
  onPaymentSuccess?: (transactionId: string) => void;
}

const PaymentMethodSelect = ({
  paymentMethod,
  onPaymentMethodChange,
  mobileNumber,
  onMobileNumberChange,
  amount,
  onPaymentSuccess,
}: PaymentMethodSelectProps) => {

  const handleKkiapaySuccess = useCallback((response: any) => {
    if (response?.transactionId) {
      onPaymentSuccess?.(response.transactionId);
    }
  }, [onPaymentSuccess]);

  useEffect(() => {
    if (typeof window.addKkiapayListener === "function") {
      window.addKkiapayListener("success", handleKkiapaySuccess);
    }
    return () => {
      if (typeof window.removeKkiapayListener === "function") {
        window.removeKkiapayListener("success", handleKkiapaySuccess);
      }
    };
  }, [handleKkiapaySuccess]);

  const openPayment = () => {
    if (typeof window.openKkiapayWidget !== "function") {
      console.error("KKiaPay SDK not loaded");
      return;
    }
    window.openKkiapayWidget({
      amount: amount || 1,
      position: "center",
      callback: "",
      data: "",
      theme: "#1a6b35",
      key: KKIAPAY_PUBLIC_KEY,
      sandbox: false,
    });
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Wallet className="w-5 h-5 text-primary" />
          Mode de paiement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        {/* KKiaPay info card */}
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-foreground">KKiaPay</p>
                <Badge className="text-[9px] bg-primary/20 text-primary border-0">Sécurisé</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Paiement sécurisé pour l'Afrique</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Smartphone, label: "Mobile Money", desc: "TMoney, Flooz, Moov, MTN" },
              { icon: CreditCard, label: "Carte bancaire", desc: "Visa, Mastercard" },
              { icon: Wallet, label: "Wave", desc: "Paiement Wave" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-background border border-border p-2.5 text-center">
                <m.icon className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-[10px] font-medium text-foreground leading-tight">{m.label}</p>
                <p className="text-[8px] text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Transaction chiffrée et sécurisée via KKiaPay — conforme PCI DSS
          </p>
        </div>

        {amount && amount > 0 && (
          <Button variant="hero" className="w-full gap-2" onClick={openPayment}>
            <ShieldCheck className="w-4 h-4" />
            Payer {amount.toLocaleString()} FCFA avec KKiaPay
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelect;
