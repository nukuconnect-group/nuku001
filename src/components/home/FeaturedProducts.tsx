import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { products as mockProducts } from "@/data/marketplace";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";
import ProductCard from "@/components/marketplace/ProductCard";

const FeaturedProducts = () => {
  const { data: dbProducts, isLoading } = useProducts();
  const { t } = useLanguage();

  const featuredProducts = useMemo(() => {
    const db = dbProducts || [];
    const all = db.length > 0 ? [...db, ...mockProducts] : mockProducts;
    return all.slice(0, 8);
  }, [dbProducts]);

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-muted/30">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} viewMode="grid" />
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
