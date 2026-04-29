import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShieldCheck, MapPin, ShoppingCart, ArrowRight, Truck, Package } from "lucide-react";
import { Product } from "@/data/marketplace";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/components/cart/CartContext";
import { useToast } from "@/hooks/use-toast";
import { getCategoryFallbackImage } from "@/lib/categoryFallbackImage";
import defaultAvatar from "@/assets/default-producer-avatar.png";

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Aperçu rapide d'un produit (modal) — déclenché depuis la fiche produit
 * (icône œil au survol sur ordinateur). Évite de charger toute la page produit.
 */
export default function ProductQuickView({ product, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const { addItem } = useCart();
  const { toast } = useToast();

  if (!product) return null;

  const fallbackImg = getCategoryFallbackImage(product.category);
  const handleAdd = () => {
    addItem(product);
    toast({ title: "Ajouté au panier", description: product.name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Aperçu de {product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Aperçu rapide du produit avec image, prix et informations principales.
        </DialogDescription>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-square bg-muted">
            <img
              src={product.image || fallbackImg}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImg; }}
            />
            {product.discount && product.discount > 0 && (
              <Badge className="absolute top-3 right-3 bg-destructive text-destructive-foreground font-bold">
                -{product.discount}%
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="p-5 flex flex-col gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground leading-tight line-clamp-2">
                {product.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                {product.description}
              </p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-heading text-2xl font-extrabold text-destructive tabular-nums">
                {formatPrice(product.price)}
              </span>
              <span className="text-xs text-muted-foreground">/ {product.unit}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through tabular-nums">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1.5 text-xs">
              <Star className="w-3.5 h-3.5 text-accent fill-accent" />
              <span className="font-semibold">{product.producer.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{product.producer.totalSales || 0}+ vendus</span>
            </div>

            {/* Producer */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
              <img
                src={product.producer.avatar || defaultAvatar}
                alt={product.producer.name}
                className="w-7 h-7 rounded-md object-cover border border-border"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultAvatar; }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {product.producer.name}
                  </span>
                  {product.producer.verified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="truncate">{product.location}</span>
                </div>
              </div>
            </div>

            {/* Quick infos */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <Badge variant="secondary" className="gap-1">
                <Package className="w-2.5 h-2.5" />
                {product.quantity > 0 ? `${product.quantity} dispo.` : "Sur commande"}
              </Badge>
              {(product.shippingDelayDays ?? 1) <= 1 && (
                <Badge variant="secondary" className="gap-1">
                  <Truck className="w-2.5 h-2.5" />
                  Expédition rapide
                </Badge>
              )}
              {product.isOrganic && (
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Bio
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="mt-auto flex gap-2 pt-2">
              <Button
                onClick={handleAdd}
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                disabled={product.quantity === 0}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Ajouter
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/product/${product.id}`);
                }}
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-xs"
              >
                Voir la fiche
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
