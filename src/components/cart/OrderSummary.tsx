import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/components/cart/CartContext";
import { CreditCard, Loader2, Minus, Plus, Trash2, MapPin, ShieldCheck } from "lucide-react";

interface OrderSummaryProps {
  deliveryPrice: number;
  isCheckingOut: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
}

const OrderSummary = ({ deliveryPrice, isCheckingOut, canCheckout, onCheckout }: OrderSummaryProps) => {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();
  const { formatPrice } = useLanguage();
  const finalTotal = total + deliveryPrice;

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

        {/* Totals */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Sous-total ({itemCount} articles)</span>
            <span className="font-medium">{formatPrice(total)}</span>
          </div>
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

        <Button
          variant="hero"
          className="w-full gap-2"
          size="lg"
          onClick={onCheckout}
          disabled={isCheckingOut || !canCheckout}
        >
          {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Passer la commande
        </Button>

        <div className="flex items-center gap-2 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] text-muted-foreground">Paiement sécurisé • Facture PDF automatique</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
