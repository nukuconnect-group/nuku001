import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/components/cart/CartContext";
import { CreditCard, Loader2, Minus, Plus, Trash2, ShieldCheck, Tag, X, CheckCircle2, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const promoCodes: Record<string, { discount: number; type: "percent" | "fixed"; label: string; minAmount?: number }> = {
  "NUKU10": { discount: 10, type: "percent", label: "10% de réduction" },
  "NUKU20": { discount: 20, type: "percent", label: "20% de réduction", minAmount: 10000 },
  "BIENVENUE": { discount: 5, type: "percent", label: "5% - Bienvenue !" },
  "LIVRAISON": { discount: 2500, type: "fixed", label: "2 500 FCFA de réduction" },
  "PROMO5000": { discount: 5000, type: "fixed", label: "5 000 FCFA de réduction", minAmount: 25000 },
};

interface OrderSummaryProps {
  deliveryPrice: number;
  isCheckingOut: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
  onDiscountChange?: (discount: number, code: string) => void;
  isPolling?: boolean;
  showPaymentStep?: boolean;
  onShowPayment?: () => void;
}

const purchasePolicyContent = `Dernière mise à jour : 09 février 2025

Chez Nukuconnect SA, nous avons à cœur de garantir une expérience fiable et transparente à tous nos utilisateurs. La présente politique précise les conditions de remboursement et de retour applicables aux transactions effectuées via la plateforme Nukuconnect.

1. Champ d'application

Cette politique s'applique à toutes les commandes passées sur Nukuconnect, que ce soit pour des produits agricoles, des intrants, ou des services, sauf mention contraire par le vendeur ou dans l'offre.
Elle ne s'applique pas aux transactions conclues en dehors de la Plateforme.

2. Responsabilité des vendeurs

Chaque vendeur est responsable de la qualité, de la conformité et de la livraison des produits ou services vendus.

Les conditions spécifiques de retour ou de remboursement d'un vendeur doivent être clairement indiquées sur sa page produit.

Nukuconnect SA agit en tant qu'intermédiaire et facilite la communication et, si nécessaire, la médiation en cas de litige.

3. Cas d'éligibilité à un remboursement ou retour

Un remboursement ou un retour peut être demandé dans les situations suivantes :

• Produit non conforme à la description (taille, variété, caractéristiques, etc.)
• Produit endommagé ou périmé à la réception
• Produit manquant par rapport à la commande initiale
• Service non exécuté conformément à ce qui était prévu

4. Procédure de demande

La demande doit être formulée via la messagerie de la plateforme dans un délai de 48 heures après réception du produit ou de l'exécution du service.

L'utilisateur doit fournir des preuves (photos, vidéos, facture) pour appuyer sa réclamation.

Nukuconnect SA transmettra la demande au vendeur concerné et suivra la procédure jusqu'à résolution.

5. Modalités de remboursement

Si le remboursement est approuvé, il sera effectué selon le mode de paiement initial (Mobile Money, carte bancaire, virement) dans un délai maximum de 7 à 14 jours ouvrés.

Les frais de retour (si applicables) peuvent être à la charge de l'acheteur ou du vendeur, selon la cause du retour :

• Défaut du vendeur (produit non conforme, endommagé) → frais à la charge du vendeur
• Changement d'avis de l'acheteur → frais à la charge de l'acheteur

6. Produits non remboursables / non retournables

Certains produits ne peuvent pas être retournés ni remboursés, sauf défaut ou non-conformité :

• Produits périssables (fruits, légumes, poisson frais, etc.)
• Produits transformés ou ouverts après livraison
• Services déjà exécutés ou en cours d'exécution

7. Litiges

En cas de désaccord persistant entre acheteur et vendeur, Nukuconnect SA peut proposer une solution de médiation.
La décision finale pourra, si nécessaire, être soumise aux juridictions compétentes.

8. Modification de la politique

Nukuconnect SA se réserve le droit de modifier cette politique à tout moment.
Toute modification sera publiée sur la Plateforme et applicable aux commandes passées après sa date d'entrée en vigueur.`;

const OrderSummary = ({ deliveryPrice, isCheckingOut, canCheckout, onCheckout, onDiscountChange, isPolling = false, showPaymentStep = false, onShowPayment }: OrderSummaryProps) => {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();
  const { formatPrice } = useLanguage();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; type: "percent" | "fixed"; label: string } | null>(null);
  const [promoError, setPromoError] = useState("");

  const discountAmount = appliedPromo
    ? appliedPromo.type === "percent"
      ? Math.round(total * appliedPromo.discount / 100)
      : appliedPromo.discount
    : 0;

  const finalTotal = total + deliveryPrice - discountAmount;

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const promo = promoCodes[code];
    if (!promo) {
      setPromoError("Code promo invalide");
      return;
    }
    if (promo.minAmount && total < promo.minAmount) {
      setPromoError(`Minimum ${formatPrice(promo.minAmount)} requis`);
      return;
    }
    setAppliedPromo({ code, ...promo });
    setPromoError("");
    const amt = promo.type === "percent" ? Math.round(total * promo.discount / 100) : promo.discount;
    onDiscountChange?.(amt, code);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
    onDiscountChange?.(0, "");
  };

  const handleOrderClick = () => {
    if (!acceptedTerms) return;
    // If payment step not yet shown, show it first
    if (!showPaymentStep && onShowPayment) {
      onShowPayment();
      return;
    }
    // Otherwise proceed to checkout (payment already visible)
    onCheckout();
  };

  return (
    <Card className="sticky top-24">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm sm:text-base">Votre commande</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        {/* Product list */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.product.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Link to={`/produit/${item.product.id}`} className="text-xs sm:text-sm font-medium text-foreground hover:text-primary line-clamp-1">
                  {item.product.name}
                </Link>
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  Fournisseur: {item.product.producer.name}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="w-6 h-6 rounded text-destructive hover:bg-destructive/10 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-primary">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy notice */}
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Vos données personnelles seront utilisées pour traiter votre commande, améliorer votre expérience sur ce site, et pour d'autres finalités décrites dans notre{" "}
          <Link to="/terms" className="text-primary hover:underline font-medium">politique de confidentialité</Link>.
        </p>

        {/* Purchase policy miniature */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="border border-border rounded-lg p-3 max-h-[100px] overflow-hidden cursor-pointer hover:border-primary/50 transition-colors relative">
              <p className="text-[10px] font-semibold text-foreground italic mb-1">Dernière mise à jour : 09 février 2025</p>
              <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3">
                Chez Nukuconnect SA, nous avons à cœur de garantir une expérience fiable et transparente à tous nos utilisateurs...
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-base">Politique d'achat & remboursement</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {purchasePolicyContent}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Accept terms checkbox */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="accept-purchase-terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="accept-purchase-terms" className="text-[10px] sm:text-xs text-muted-foreground cursor-pointer leading-relaxed">
            J'ai lu et j'accepte les{" "}
            <Dialog>
              <DialogTrigger asChild>
                <span className="text-primary hover:underline font-medium cursor-pointer">conditions générales d'achat</span>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="text-base">Politique d'achat & remboursement</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {purchasePolicyContent}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            {" "}<span className="text-destructive">*</span>
          </label>
        </div>

        {/* Promo Code */}
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" />
            Code promo
          </p>
          {appliedPromo ? (
            <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-primary">{appliedPromo.code}</p>
                  <p className="text-[10px] text-muted-foreground">{appliedPromo.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] text-primary">-{formatPrice(discountAmount)}</Badge>
                <button onClick={handleRemovePromo} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                placeholder="Entrer un code"
                className="h-8 text-xs flex-1"
              />
              <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={handleApplyPromo}>
                Appliquer
              </Button>
            </div>
          )}
          {promoError && <p className="text-[10px] text-destructive">{promoError}</p>}
        </div>

        {/* Totals */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Sous-total ({itemCount} articles)</span>
            <span className="font-medium">{formatPrice(total)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-primary">Réduction ({appliedPromo?.code})</span>
              <span className="text-primary font-medium">-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Livraison</span>
            <span className={deliveryPrice === 0 ? "text-primary font-medium" : "font-medium"}>
              {deliveryPrice === 0 ? "Gratuit" : formatPrice(deliveryPrice)}
            </span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="flex justify-between font-bold text-base sm:text-lg">
          <span>Total</span>
          <span className="text-primary">{formatPrice(finalTotal)}</span>
        </div>

        {/* Step 1: Commander button (shows payment options) */}
        {!showPaymentStep && (
          <Button
            variant="hero"
            className="w-full gap-2"
            size="lg"
            onClick={handleOrderClick}
            disabled={!canCheckout || !acceptedTerms}
          >
            <ShoppingBag className="w-4 h-4" />
            Passer la commande
          </Button>
        )}

        {/* Step 2: Confirm payment button (after payment method selected) */}
        {showPaymentStep && (
          <Button
            variant="hero"
            className="w-full gap-2"
            size="lg"
            onClick={onCheckout}
            disabled={isCheckingOut || !canCheckout || !acceptedTerms || isPolling}
          >
            {isCheckingOut || isPolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {isPolling ? "Vérification du paiement..." : isCheckingOut ? "Traitement..." : `Confirmer & payer ${formatPrice(finalTotal)}`}
          </Button>
        )}

        <div className="flex items-center gap-2 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] text-muted-foreground">Paiement sécurisé • Facture PDF automatique</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
