import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "./CartContext";
import { ShoppingCart, Trash2, Plus, Minus, MapPin, ArrowRight } from "lucide-react";

interface CartSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CartSidebar = ({ open, onOpenChange }: CartSidebarProps) => {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <ShoppingCart className="w-5 h-5" />
            Mon Panier ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Panier vide</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Parcourez le marketplace pour ajouter des produits
            </p>
            <Link to="/marketplace" onClick={() => onOpenChange(false)}>
              <Button variant="hero" size="sm">
                Explorer le marketplace
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/produit/${item.product.id}`}
                        onClick={() => onOpenChange(false)}
                        className="font-medium text-sm text-foreground hover:text-primary line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {item.product.location}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary text-sm">
                          {formatPrice(item.product.price)} FCFA
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="w-6 h-6 rounded-full text-destructive hover:bg-destructive/10 flex items-center justify-center ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(total)} FCFA
                </span>
              </div>
              <Link to="/cart" onClick={() => onOpenChange(false)}>
                <Button variant="hero" className="w-full gap-2">
                  Commander
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Livraison : DHL International, Gozem National
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSidebar;
