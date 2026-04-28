import { useNavigate } from "react-router-dom";
import { Heart, Plus, Flame, Star, ShieldCheck } from "lucide-react";
import { Product } from "@/data/marketplace";
import { cn } from "@/lib/utils";

interface SponsoredProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
}

/**
 * Carte produit sponsorisé style AliExpress :
 * - image carrée avec coeur en haut-droite et bouton + dans cercle blanc
 * - barre prix orange avec prix barré et badge -X% rouge incliné
 * - tag "Vérifié" type "Choice" si producteur vérifié
 * - "stock faible" / "X restant" + flamme si urgence
 * - "X vendus" + étoile rating
 */
const SponsoredProductCard = ({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false,
}: SponsoredProductCardProps) => {
  const navigate = useNavigate();
  const discount = product.discount && product.discount > 0 ? product.discount : null;
  const originalPrice =
    product.originalPrice ?? (discount ? Math.round(product.price / (1 - discount / 100)) : null);

  const sales = product.producer.totalSales ?? 0;
  const lowStock = product.quantity > 0 && product.quantity <= 10;
  const stockLabel =
    product.quantity === 0
      ? "Rupture"
      : product.quantity <= 5
        ? "Stock faible"
        : product.quantity <= 10
          ? `${product.quantity} restant`
          : null;

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const handleClick = () => {
    if (product.slug) navigate(`/produit/${product.slug}`);
    else navigate(`/produit/${product.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative w-full bg-card rounded-lg overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick();
      }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Heart top-right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          aria-label="Ajouter aux favoris"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background transition-colors"
        >
          <Heart
            className={cn(
              "w-3.5 h-3.5 transition-colors",
              isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground",
            )}
          />
        </button>

        {/* Add to cart bottom-right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product);
          }}
          aria-label="Ajouter au panier"
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-background flex items-center justify-center shadow-md hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Price strip */}
      <div className="relative flex items-center bg-primary/10 px-2 py-1.5">
        <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
          <span className="text-[13px] font-bold text-primary leading-none">
            XOF{product.price.toLocaleString("fr-FR")}
          </span>
          {originalPrice && originalPrice > product.price && (
            <span className="text-[10px] text-muted-foreground line-through truncate">
              XOF{originalPrice.toLocaleString("fr-FR")}
            </span>
          )}
        </div>

        {discount && (
          <div
            className="relative flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 ml-1"
            style={{
              clipPath: "polygon(8% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            -{discount}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-2 pt-1.5 pb-2 space-y-1">
        {/* Verified badge + name */}
        <div className="flex items-start gap-1">
          {product.producer.verified && (
            <span className="inline-flex items-center gap-0.5 bg-primary text-primary-foreground text-[9px] font-semibold px-1 py-0.5 rounded-sm flex-shrink-0">
              <ShieldCheck className="w-2.5 h-2.5" />
              Vérifié
            </span>
          )}
          <h3 className="text-[12px] text-foreground leading-snug line-clamp-2 flex-1">
            {product.name}
          </h3>
        </div>

        {/* Stock urgency */}
        {stockLabel && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-destructive">
            <Flame className="w-3 h-3" />
            <span>{stockLabel}</span>
          </div>
        )}

        {/* Sales + rating */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {sales > 0 && <span>{formatNumber(sales)} vendus</span>}
          {sales > 0 && product.producer.rating > 0 && (
            <span className="text-muted-foreground/40">|</span>
          )}
          {product.producer.rating > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">
                {product.producer.rating.toFixed(1)}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SponsoredProductCard;
