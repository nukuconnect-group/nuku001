import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Loader2, Star, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getCategoryFallbackImage } from "@/lib/categoryFallbackImage";
import type { Product } from "@/data/marketplace";

/**
 * Featured / "Pour vous" products.
 * Mosaïque pro identique sur mobile, tablette et desktop :
 * 1 hero card + 4 cartes secondaires (grille 2 colonnes en dessous).
 */
const FeaturedProducts = () => {
  const { data: dbProducts, isLoading } = useProducts();
  const { t, formatPrice } = useLanguage();

  const featuredProducts = useMemo(() => {
    const db = dbProducts || [];
    return [...db]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [dbProducts]);

  // 1 hero + 4 secondaires (5 produits visibles)
  const heroProduct = featuredProducts[0];
  const sideProducts = featuredProducts.slice(1, 5);

  if (featuredProducts.length === 0 && !isLoading) return null;

  return (
    <section className="py-4 sm:py-8 lg:py-12 bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-5">
          <h2 className="font-heading text-[13px] sm:text-lg lg:text-2xl font-bold text-foreground flex items-center gap-1.5 sm:gap-2 leading-tight">
            <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg bg-primary/10 flex-shrink-0">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-primary" />
            </span>
            Produits populaires
          </h2>
          <Link to="/marketplace" className="flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-[11px] sm:text-sm text-primary gap-1 px-2 sm:px-3 h-8">
              {t("mp.viewAll")}
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ===== Mosaïque pro — sur TOUS les écrans (mobile, tablette, desktop) ===== */}
            {heroProduct && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                {/* HERO card */}
                <FeaturedHeroCard product={heroProduct} formatPrice={formatPrice} />

                {/* Side grid — 2 colonnes (mobile inclus) */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
                  {sideProducts.map((product) => (
                    <FeaturedSecondaryCard
                      key={product.id}
                      product={product}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="text-center mt-6 sm:mt-8">
          <Link to="/marketplace">
            <Button variant="hero" size="sm" className="group text-xs sm:text-sm">
              {t("nav.marketplace")}
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// Sub-components — Desktop/Tablet only
// ============================================================

interface CardProps {
  product: Product;
  formatPrice: (n: number) => string;
}

const FeaturedHeroCard = ({ product, formatPrice }: CardProps) => {
  const [imgError, setImgError] = useState(false);
  const src = imgError || !product.image
    ? getCategoryFallbackImage(product.category, product.name)
    : product.image;

  return (
    <Link
      to={`/produit/${product.slug || product.id}`}
      className="group relative block overflow-hidden rounded-2xl bg-card shadow-soft hover:shadow-elevated transition-all duration-300 min-h-[420px] lg:min-h-[480px]"
    >
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        onError={() => setImgError(true)}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />

      {/* Top badge */}
      <div className="absolute top-3 left-3">
        <Badge className="bg-primary text-primary-foreground font-bold text-[10px] px-2 py-1 rounded-full shadow gap-1">
          <Sparkles className="w-3 h-3" />
          NOUVEAU
        </Badge>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6 text-white">
        <p className="text-[10px] uppercase tracking-wider text-white/80 font-semibold mb-2">
          {product.category}
        </p>
        <h3 className="font-heading text-xl lg:text-2xl font-bold leading-tight mb-1.5 line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs lg:text-sm text-white/85 line-clamp-1 mb-3">
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < Math.round(product.producer.rating)
                  ? "text-accent fill-accent"
                  : "text-white/30"
              }`}
            />
          ))}
          <span className="text-[10px] text-white/80 ml-1">
            ({Math.floor(product.producer.rating * 12)})
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-heading text-2xl lg:text-3xl font-bold text-white">
              {formatPrice(product.price)}
            </p>
            <p className="text-[10px] text-white/70">/{product.unit}</p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/85">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{product.location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const FeaturedSecondaryCard = ({ product, formatPrice }: CardProps) => {
  const [imgError, setImgError] = useState(false);
  const src = imgError || !product.image
    ? getCategoryFallbackImage(product.category, product.name)
    : product.image;

  return (
    <Link
      to={`/produit/${product.slug || product.id}`}
      className="group relative block overflow-hidden rounded-xl bg-card shadow-soft hover:shadow-elevated transition-all duration-300 min-h-[200px] lg:min-h-[230px]"
    >
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        onError={() => setImgError(true)}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

      <div className="absolute top-2.5 left-2.5">
        <Badge className="bg-accent text-accent-foreground font-bold text-[9px] px-2 py-0.5 rounded-full shadow">
          NEW
        </Badge>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4 text-white">
        <p className="text-[9px] uppercase tracking-wider text-white/80 font-semibold mb-1 line-clamp-1">
          {product.category}
        </p>
        <h3 className="font-heading text-sm lg:text-base font-bold leading-tight mb-1.5 line-clamp-1">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-1.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-2.5 h-2.5 ${
                i < Math.round(product.producer.rating)
                  ? "text-accent fill-accent"
                  : "text-white/30"
              }`}
            />
          ))}
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="font-heading text-base lg:text-lg font-bold text-white">
            {formatPrice(product.price)}
          </p>
          <div className="flex items-center gap-0.5 text-[10px] text-white/85">
            <MapPin className="w-2.5 h-2.5" />
            <span className="truncate max-w-[80px]">{product.location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default FeaturedProducts;
