import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import moovFloozLogo from "@/assets/moov-flooz.png";
import mixxYasLogo from "@/assets/mixx-yas.png";
import visaMcLogo from "@/assets/visa-mastercard.png";

// Keep export for backward compat
const paymentMethods = [
  { id: "paygate", name: "Paygate", description: "Mobile Money, Visa, Mastercard", icon: Wallet, tag: "Recommandé" },
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const { toast } = useToast();

  const networks = [
    { id: "FLOOZ", label: "Moov Money / Flooz", logo: moovFloozLogo },
    { id: "TMONEY", label: "Mixx by Yas (T-Money)", logo: mixxYasLogo },
    { id: "CARD", label: "Visa / Mastercard", logo: visaMcLogo },
  ];

  const openPayment = async () => {
    if (!amount || amount <= 0) return;

    if (selectedNetwork !== "CARD" && !mobileNumber) {
      toast({ title: "Numéro requis", description: "Entrez votre numéro de téléphone Mobile Money.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const identifier = `NUKU-${Date.now()}`;

      const { data, error } = await supabase.functions.invoke("paygate-init", {
        body: {
          amount,
          description: `Commande NUKUCONNECT - ${amount} FCFA`,
          identifier,
          phone_number: mobileNumber.replace(/\s/g, ""),
          network: selectedNetwork === "CARD" ? "" : selectedNetwork === "FLOOZ" ? "FLOOZ" : "TMONEY",
        },
      });

      if (error) throw error;

      if (data?.mode === "redirect" && data?.payment_url) {
        window.open(data.payment_url, "_blank");
        toast({ title: "Paiement initié", description: "Complétez le paiement dans la fenêtre ouverte." });
        // Poll or wait for callback
        onPaymentSuccess?.(data.tx_reference || identifier);
      } else if (data?.success) {
        toast({ title: "Paiement envoyé", description: "Validez la transaction sur votre téléphone." });
        onPaymentSuccess?.(data.tx_reference || identifier);
      } else {
        toast({ title: "Paiement en cours", description: "Si vous recevez une demande de confirmation, validez-la sur votre téléphone." });
        onPaymentSuccess?.(identifier);
      }
    } catch (err: any) {
      toast({ title: "Erreur de paiement", description: err.message || "Réessayez plus tard.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
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
        {/* Paygate info card */}
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-foreground">Paygate Global</p>
                <Badge className="text-[9px] bg-primary/20 text-primary border-0">Sécurisé</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Paiement sécurisé Mobile Money & Carte bancaire</p>
            </div>
          </div>

          {/* Payment method logos */}
          <div className="grid grid-cols-3 gap-2">
            {networks.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedNetwork(n.id)}
                className={`rounded-xl bg-background border-2 p-2 text-center transition-all ${
                  selectedNetwork === n.id
                    ? "border-primary shadow-sm ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <img src={n.logo} alt={n.label} className="h-8 sm:h-10 mx-auto object-contain mb-1" />
                <p className="text-[9px] sm:text-[10px] font-medium text-foreground leading-tight">{n.label}</p>
              </button>
            ))}
          </div>

          {/* Phone number for Mobile Money */}
          {selectedNetwork && selectedNetwork !== "CARD" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Numéro {selectedNetwork === "FLOOZ" ? "Moov" : "Togocel"}
              </Label>
              <Input
                type="tel"
                placeholder="+228 XX XX XX XX"
                value={mobileNumber}
                onChange={(e) => onMobileNumberChange(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Transaction chiffrée et sécurisée via Paygate Global
          </p>
        </div>

        {amount && amount > 0 && selectedNetwork && (
          <Button
            variant="hero"
            className="w-full gap-2"
            onClick={openPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {isProcessing ? "Traitement en cours..." : `Payer ${amount.toLocaleString()} FCFA`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelect;
