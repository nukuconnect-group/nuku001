import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo, useRef, useCallback, useEffect } from "react";
import ProductCard from "@/components/marketplace/ProductCard";

const FeaturedProducts = () => {
  const { data: dbProducts, isLoading } = useProducts();
  const { t } = useLanguage();

  const featuredProducts = useMemo(() => {
    const db = dbProducts || [];
    return [...db]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [dbProducts]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval>>();

  const startAutoScroll = useCallback(() => {
    if (!scrollRef.current) return;
    autoScrollTimer.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = 180;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: cardWidth, behavior: 'smooth' });
      }
    }, 3500);
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => clearInterval(autoScrollTimer.current);
  }, [startAutoScroll, featuredProducts]);

  const handleTouchStart = () => clearInterval(autoScrollTimer.current);
  const handleTouchEnd = () => { clearInterval(autoScrollTimer.current); startAutoScroll(); };

  if (featuredProducts.length === 0 && !isLoading) return null;

  return (
    <section className="py-4 sm:py-6 lg:py-8 bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="font-heading text-sm sm:text-lg lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t("mp.forYou")}
          </h2>
          <Link to="/marketplace">
            <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
              {t("mp.viewAll")}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div
            ref={scrollRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}>
            {featuredProducts.map((product) => (
              <div key={product.id} className="w-[140px] sm:w-[180px] h-[260px] sm:h-[320px] snap-start flex-shrink-0">
                <ProductCard product={product} viewMode="grid" />
              </div>
            ))}
          </div>
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

export default FeaturedProducts;
