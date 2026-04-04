import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, Loader2, Phone, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePaygatePolling } from "@/hooks/usePaygatePolling";
import moovFloozLogo from "@/assets/moov-flooz.png";
import mixxYasLogo from "@/assets/mixx-yas.png";
import visaMcLogo from "@/assets/visa-mastercard.png";

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
  hidePayButton?: boolean;
  isPolling?: boolean;
  onNetworkChange?: (network: string) => void;
}

const PaymentMethodSelect = ({
  paymentMethod,
  onPaymentMethodChange,
  mobileNumber,
  onMobileNumberChange,
  amount,
  onPaymentSuccess,
  hidePayButton = false,
  isPolling = false,
}: PaymentMethodSelectProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [paymentIdentifier, setPaymentIdentifier] = useState<string>("");
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const { toast } = useToast();

  // Only use internal polling when NOT in hidePayButton mode (standalone usage)
  const handleCompleted = useCallback((data: any) => {
    setPollingEnabled(false);
    setIsProcessing(false);
    toast({ title: "✅ Paiement confirmé !", description: `Transaction ${data?.tx_reference || ""} réussie.` });
    onPaymentSuccess?.(data?.tx_reference || paymentIdentifier);
  }, [toast, onPaymentSuccess, paymentIdentifier]);

  const handleFailed = useCallback(() => {
    setPollingEnabled(false);
    setIsProcessing(false);
    toast({ title: "❌ Paiement échoué", description: "La transaction n'a pas abouti. Réessayez.", variant: "destructive" });
  }, [toast]);

  const handleExpired = useCallback(() => {
    setPollingEnabled(false);
    setIsProcessing(false);
    toast({ title: "⏰ Délai expiré", description: "Le paiement n'a pas été confirmé dans le délai imparti.", variant: "destructive" });
  }, [toast]);

  const { status: pollingStatus, attempts } = usePaygatePolling({
    identifier: paymentIdentifier,
    enabled: pollingEnabled && !hidePayButton,
    intervalMs: 5000,
    maxAttempts: 60,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onExpired: handleExpired,
  });

  const networks = [
    { id: "FLOOZ", label: "Moov Money / Flooz", logo: moovFloozLogo },
    { id: "TMONEY", label: "Mixx by Yas (T-Money)", logo: mixxYasLogo },
    { id: "CARD", label: "Visa / Mastercard", logo: visaMcLogo },
  ];

  const showPolling = hidePayButton ? isPolling : pollingEnabled;
  const isDisabled = isProcessing || showPolling;

  const openPayment = async () => {
    if (!amount || amount <= 0) return;
    if (selectedNetwork !== "CARD" && !mobileNumber) {
      toast({ title: "Numéro requis", description: "Entrez votre numéro de téléphone Mobile Money.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const identifier = `NUKU-${Date.now()}`;
      setPaymentIdentifier(identifier);

      const { data, error } = await supabase.functions.invoke("paygate-init", {
        body: {
          amount,
          description: `Commande NUKUCONNECT - ${amount} FCFA`,
          identifier,
          phone_number: mobileNumber.replace(/\s/g, ""),
          network: selectedNetwork === "CARD" ? "" : selectedNetwork,
        },
      });

      if (error) throw error;

      if (data?.mode === "redirect" && data?.payment_url) {
        window.open(data.payment_url, "_blank");
      }

      setPollingEnabled(true);
      toast({ title: "Paiement initié", description: selectedNetwork === "CARD" ? "Complétez le paiement dans la fenêtre ouverte." : "Validez la transaction sur votre téléphone." });
    } catch (err: any) {
      setIsProcessing(false);
      toast({ title: "Erreur de paiement", description: err.message || "Réessayez plus tard.", variant: "destructive" });
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

          <div className="grid grid-cols-3 gap-2">
            {networks.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !isDisabled && setSelectedNetwork(n.id)}
                className={`rounded-xl bg-background border-2 p-2 text-center transition-all ${
                  selectedNetwork === n.id
                    ? "border-primary shadow-sm ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <img src={n.logo} alt={n.label} className="h-8 sm:h-10 mx-auto object-contain mb-1" />
                <p className="text-[9px] sm:text-[10px] font-medium text-foreground leading-tight">{n.label}</p>
              </button>
            ))}
          </div>

          {selectedNetwork && selectedNetwork !== "CARD" && !showPolling && (
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
                disabled={isDisabled}
              />
            </div>
          )}

          {/* Polling status indicator */}
          {showPolling && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-foreground">Vérification du paiement en cours...</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {selectedNetwork === "CARD" ? "Complétez le paiement dans la fenêtre..." : "Validez sur votre téléphone..."}
                </span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Transaction chiffrée et sécurisée via Paygate Global
          </p>
        </div>

        {/* Only show standalone pay button when not in cart mode */}
        {!hidePayButton && amount && amount > 0 && selectedNetwork && !pollingEnabled && (
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
