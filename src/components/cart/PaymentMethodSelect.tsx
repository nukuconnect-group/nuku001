import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Wallet, Smartphone, CreditCard, Package } from "lucide-react";

const paymentMethods = [
  { id: "mobile_money", name: "Mobile Money", description: "TMoney, Flooz, Moov Money", icon: Smartphone, tag: "Populaire" },
  { id: "wave", name: "Wave", description: "Paiement instantané via Wave", icon: Wallet, tag: "Rapide" },
  { id: "card", name: "Carte bancaire", description: "Visa, Mastercard", icon: CreditCard, tag: "International" },
  { id: "cash", name: "Paiement à la livraison", description: "Payez en espèces à la réception", icon: Package, tag: "Cash" },
];

export { paymentMethods };

interface PaymentMethodSelectProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  mobileNumber: string;
  onMobileNumberChange: (number: string) => void;
}

const PaymentMethodSelect = ({
  paymentMethod, onPaymentMethodChange,
  mobileNumber, onMobileNumberChange
}: PaymentMethodSelectProps) => {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Wallet className="w-5 h-5 text-primary" />
          Mode de paiement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <RadioGroup value={paymentMethod} onValueChange={onPaymentMethodChange}>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <div key={method.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  paymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => onPaymentMethodChange(method.id)}>
                <RadioGroupItem value={method.id} id={`pay-${method.id}`} />
                <method.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor={`pay-${method.id}`} className="font-medium cursor-pointer text-xs sm:text-sm">{method.name}</Label>
                    <Badge variant="secondary" className="text-[9px]">{method.tag}</Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{method.description}</p>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        {(paymentMethod === "mobile_money" || paymentMethod === "wave") && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-xl border border-border">
            <h4 className="font-medium text-xs flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              Numéro de paiement
            </h4>
            <div className="space-y-1.5">
              <Label className="text-xs">Numéro de téléphone <span className="text-destructive">*</span></Label>
              <Input
                type="tel"
                placeholder="+228 90 XX XX XX"
                value={mobileNumber}
                onChange={(e) => onMobileNumberChange(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[9px] text-muted-foreground">
                {paymentMethod === "mobile_money"
                  ? "Vous recevrez une notification pour confirmer via TMoney, Flooz ou Moov Money."
                  : "Vous recevrez une notification Wave pour confirmer le paiement."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelect;
