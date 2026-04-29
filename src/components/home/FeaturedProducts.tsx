import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Loader2, Star, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import ProductCard from "@/components/marketplace/ProductCard";
import { Badge } from "@/components/ui/badge";
import { getCategoryFallbackImage } from "@/lib/categoryFallbackImage";
import type { Product } from "@/data/marketplace";

/**
 * Featured / "Pour vous" products.
 * - Mobile: scroll horizontal (auto-défilement) — comportement existant.
 * - Tablette & ordinateur: mosaïque pro avec 1 hero card à gauche + 4 cartes à droite,
 *   inspiré du design "Nouveautés" de la marketplace.
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

  // Desktop / tablette : 1 hero + 4 secondaires (5 produits visibles)
  const heroProduct = featuredProducts[0];
  const sideProducts = featuredProducts.slice(1, 5);

  // ========== Mobile scroll auto ==========
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval>>();

  const startAutoScroll = useCallback(() => {
    if (!scrollRef.current) return;
    autoScrollTimer.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = 180;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 3500);
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => clearInterval(autoScrollTimer.current);
  }, [startAutoScroll, featuredProducts]);

  const handleTouchStart = () => clearInterval(autoScrollTimer.current);
  const handleTouchEnd = () => {
    clearInterval(autoScrollTimer.current);
    startAutoScroll();
  };

  if (featuredProducts.length === 0 && !isLoading) return null;

  return (
    <section className="py-4 sm:py-8 lg:py-12 bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="font-heading text-sm sm:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t("mp.forYou")}
          </h2>
          <Link to="/marketplace">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm text-primary gap-1">
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
