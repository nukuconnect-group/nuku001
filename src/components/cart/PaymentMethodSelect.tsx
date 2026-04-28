import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, Loader2, Phone, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePaygatePolling } from "@/hooks/usePaygatePolling";
import moovFloozLogo from "@/assets/moov-flooz.png";
import mixxYasLogo from "@/assets/mixx-yas.png";

const paymentMethods = [
  { id: "mobile_money", name: "Mobile Money", description: "Moov Money, Mixx by Yas", icon: Wallet, tag: "Recommandé" },
];
export { paymentMethods };

// Préfixes Mobile Money au Togo (numéros à 8 chiffres, sans indicatif)
const FLOOZ_PREFIXES = ["90", "91", "96", "97", "98", "99"]; // Moov Money / Flooz
const YAS_PREFIXES = ["70", "71", "79", "92", "93", "94"];   // Mixx by Yas / T-Money

/** Nettoie le numéro: garde les chiffres, retire l'indicatif 228 si présent */
const normalizePhone = (raw: string): string => {
  const digits = (raw || "").replace(/[^\d]/g, "");
  return digits.startsWith("228") ? digits.slice(3) : digits;
};

/** Détecte le réseau (FLOOZ | TMONEY) à partir du numéro */
export const detectNetworkFromPhone = (raw: string): "FLOOZ" | "TMONEY" | "" => {
  const local = normalizePhone(raw);
  if (local.length < 2) return "";
  const prefix = local.slice(0, 2);
  if (FLOOZ_PREFIXES.includes(prefix)) return "FLOOZ";
  if (YAS_PREFIXES.includes(prefix)) return "TMONEY";
  return "";
};

/** Validation complète d'un numéro Togo Mobile Money */
export const validateMobileMoneyPhone = (raw: string): { valid: boolean; reason?: string; network?: "FLOOZ" | "TMONEY" } => {
  const local = normalizePhone(raw);
  if (!local) return { valid: false, reason: "Veuillez entrer un numéro de téléphone." };
  if (local.length !== 8) return { valid: false, reason: "Le numéro doit comporter 8 chiffres (sans l'indicatif)." };
  const network = detectNetworkFromPhone(raw);
  if (!network) return { valid: false, reason: "Préfixe inconnu. Utilisez un numéro Moov ou Mixx by Yas." };
  return { valid: true, network };
};

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
  onNetworkChange,
}: PaymentMethodSelectProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIdentifier, setPaymentIdentifier] = useState<string>("");
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [manualNetwork, setManualNetwork] = useState<"FLOOZ" | "TMONEY" | "">("");
  const { toast } = useToast();

  // Auto-détection depuis le numéro
  const autoNetwork = useMemo(() => detectNetworkFromPhone(mobileNumber), [mobileNumber]);
  // Réseau effectif : priorité au choix manuel, sinon auto-détection
  const detectedNetwork = manualNetwork || autoNetwork;
  const validation = useMemo(() => {
    const base = validateMobileMoneyPhone(mobileNumber);
    if (base.valid && manualNetwork) return { ...base, network: manualNetwork };
    return base;
  }, [mobileNumber, manualNetwork]);

  // Propage le réseau au parent
  useEffect(() => {
    onNetworkChange?.(detectedNetwork);
  }, [detectedNetwork, onNetworkChange]);

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

  usePaygatePolling({
    identifier: paymentIdentifier,
    enabled: pollingEnabled && !hidePayButton,
    intervalMs: 5000,
    maxAttempts: 60,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onExpired: handleExpired,
  });

  const showPolling = hidePayButton ? isPolling : pollingEnabled;
  const isDisabled = isProcessing || showPolling;

  const openPayment = async () => {
    if (!amount || amount <= 0) return;
    if (!validation.valid) {
      toast({ title: "Numéro invalide", description: validation.reason || "Vérifiez votre numéro.", variant: "destructive" });
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
          phone_number: normalizePhone(mobileNumber),
          network: validation.network,
          use_redirect: false,
        },
      });

      if (error) throw error;

      setPollingEnabled(true);
      toast({
        title: "Paiement initié",
        description: `Validez la transaction sur votre téléphone ${validation.network === "FLOOZ" ? "Moov Money" : "Mixx by Yas"}.`,
      });
    } catch (err: any) {
      setIsProcessing(false);
      toast({ title: "Erreur de paiement", description: err.message || "Réessayez plus tard.", variant: "destructive" });
    }
  };

  const networkLabel = detectedNetwork === "FLOOZ" ? "Moov Money / Flooz" : detectedNetwork === "TMONEY" ? "Mixx by Yas" : "";
  const networkLogo = detectedNetwork === "FLOOZ" ? moovFloozLogo : detectedNetwork === "TMONEY" ? mixxYasLogo : null;

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
                <p className="font-semibold text-sm text-foreground">Mobile Money</p>
                <Badge className="text-[9px] bg-primary/20 text-primary border-0">Sécurisé</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Paiement Moov Money & Mixx by Yas</p>
            </div>
          </div>

          {/* Réseaux supportés — affichage informatif aligné */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-background border border-border p-2.5 flex items-center justify-center h-16">
              <img src={moovFloozLogo} alt="Moov Money / Flooz" className="max-h-10 max-w-full object-contain" />
            </div>
            <div className="rounded-xl bg-background border border-border p-2.5 flex items-center justify-center h-16">
              <img src={mixxYasLogo} alt="Mixx by Yas" className="max-h-10 max-w-full object-contain" />
            </div>
          </div>

          {/* Sélection manuelle du réseau (cliquable) */}
          <div>
            <Label className="text-xs mb-1.5 block">Choisir votre opérateur</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setManualNetwork(manualNetwork === "FLOOZ" ? "" : "FLOOZ")}
                disabled={isDisabled}
                className={`rounded-xl bg-background p-2.5 flex items-center justify-center h-16 transition-all ${
                  detectedNetwork === "FLOOZ"
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : "border border-border hover:border-primary/50"
                }`}
                aria-label="Choisir Moov Money"
              >
                <img src={moovFloozLogo} alt="Moov Money / Flooz" className="max-h-10 max-w-full object-contain" />
              </button>
              <button
                type="button"
                onClick={() => setManualNetwork(manualNetwork === "TMONEY" ? "" : "TMONEY")}
                disabled={isDisabled}
                className={`rounded-xl bg-background p-2.5 flex items-center justify-center h-16 transition-all ${
                  detectedNetwork === "TMONEY"
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : "border border-border hover:border-primary/50"
                }`}
                aria-label="Choisir Mixx by Yas"
              >
                <img src={mixxYasLogo} alt="Mixx by Yas" className="max-h-10 max-w-full object-contain" />
              </button>
            </div>
          </div>

          {/* Champ numéro avec auto-détection */}
          {!showPolling && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Numéro Mobile Money
              </Label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="Ex : 90 12 34 56"
                value={mobileNumber}
                onChange={(e) => onMobileNumberChange(e.target.value)}
                maxLength={20}
                className="h-9 text-sm"
                disabled={isDisabled}
              />
              {/* Feedback auto-détection */}
              {mobileNumber && detectedNetwork && networkLogo && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-2 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <img src={networkLogo} alt={networkLabel} className="h-5 object-contain" />
                  <span className="text-[11px] text-foreground">Réseau détecté : <span className="font-medium">{networkLabel}</span></span>
                </div>
              )}
              {mobileNumber && !validation.valid && validation.reason && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-2 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  <span className="text-[11px] text-destructive">{validation.reason}</span>
                </div>
              )}
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
                <span className="text-[10px] text-muted-foreground">Validez sur votre téléphone...</span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Transaction chiffrée et sécurisée
          </p>
        </div>

        {/* Bouton de paiement standalone (hors panier) */}
        {!hidePayButton && amount && amount > 0 && validation.valid && !pollingEnabled && (
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
            {isProcessing ? "Traitement en cours..." : `Payer ${amount.toLocaleString("en-US")} FCFA`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelect;
