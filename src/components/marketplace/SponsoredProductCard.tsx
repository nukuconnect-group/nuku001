import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Flame, Star } from "lucide-react";
import { Product } from "@/data/marketplace";
import { cn } from "@/lib/utils";

interface SponsoredProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
}

/**
 * Carte produit sponsorisé style AliExpress Choice :
 * - image carrée fond gris clair, coeur top-right, panier cercle blanc bottom-right
 * - prix XOF rouge gras + ancien prix barré gris + badge -X% rouge en flèche pointant à gauche
 * - badge "Choice" jaune ou "Marque+" bleu avant titre
 * - flamme orange + "Stock faible / X restant" en rouge
 * - "X vendus | ⭐ note" en gris
 * - fond carte blanc pur
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
  const stockLabel =
    product.quantity === 0
      ? "Rupture"
      : product.quantity <= 5
        ? "Stock faible"
        : product.quantity <= 10
          ? `${product.quantity} restant`
          : null;

  // Badge type : "Marque+" si vérifié + rating élevé, sinon "Choice" pour les autres sponsorisés
  const isMarquePlus = product.producer.verified && product.producer.rating >= 4.5;
  const showChoiceBadge = !isMarquePlus;

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
      className="group relative w-full bg-card rounded-lg overflow-hidden cursor-pointer"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick();
      }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted/40 overflow-hidden rounded-lg">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />

        {/* Heart top-right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          aria-label="Ajouter aux favoris"
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center"
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors drop-shadow-sm",
              isWishlisted ? "fill-destructive text-destructive" : "fill-background/70 text-muted-foreground",
            )}
            strokeWidth={2}
          />
        </button>

        {/* Cart bottom-right - white circle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product);
          }}
          aria-label="Ajouter au panier"
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-background flex items-center justify-center shadow-md hover:scale-105 transition-transform"
        >
          <ShoppingCart className="w-4 h-4 text-foreground" strokeWidth={2} />
          <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold text-foreground">+</span>
        </button>
      </div>

      {/* Price row : prix rouge + ancien prix barré + badge -X% flèche */}
      <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
        <span className="text-[15px] font-bold text-destructive leading-none">
          XOF{product.price.toLocaleString("fr-FR")}
        </span>
        {originalPrice && originalPrice > product.price && (
          <span className="text-[11px] text-muted-foreground line-through">
            XOF{originalPrice.toLocaleString("fr-FR")}
          </span>
        )}

        {discount && (
          <div
            className="ml-auto relative bg-destructive text-destructive-foreground text-[11px] font-bold px-2 py-0.5 leading-tight"
            style={{
              clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            -{discount}%
          </div>
        )}
      </div>

      {/* Title + badge prefix */}
      <div className="flex items-start gap-1 mt-1 px-0.5">
        {isMarquePlus && (
          <span className="inline-flex items-center bg-blue-600 text-white text-[10px] font-semibold px-1 py-0.5 rounded-sm flex-shrink-0 leading-none">
            Marque+
          </span>
        )}
        {showChoiceBadge && (
          <span className="inline-flex items-center bg-amber-200 text-amber-900 text-[10px] font-semibold px-1 py-0.5 rounded-sm flex-shrink-0 leading-none italic">
            Choice
          </span>
        )}
        <h3 className="text-[12px] text-foreground leading-snug line-clamp-2 flex-1">
          {product.name}
        </h3>
      </div>

      {/* Stock urgency */}
      {stockLabel && (
        <div className="flex items-center gap-1 mt-1 px-0.5 text-[12px] font-medium text-destructive">
          <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
          <span>{stockLabel}</span>
        </div>
      )}

      {/* Sales + rating */}
      <div className="flex items-center gap-1.5 mt-0.5 px-0.5 pb-1 text-[11px] text-muted-foreground">
        {sales > 0 && <span>{formatNumber(sales)} vendus</span>}
        {sales > 0 && product.producer.rating > 0 && (
          <span className="text-muted-foreground/40">|</span>
        )}
        {product.producer.rating > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">
              {product.producer.rating.toFixed(1)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

export default SponsoredProductCard;
