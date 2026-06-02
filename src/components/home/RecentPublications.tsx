import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/marketplace/ProductCard";

const RecentPublications = () => {
  const { data: products } = useProducts();

  const recentProducts = useMemo(() => (products || []).slice(0, 8), [products]);

  if (recentProducts.length === 0) return null;

  return (
    <section className="px-3 sm:px-0 py-3 sm:py-5 bg-background">
      <div className="sm:container sm:mx-auto sm:px-4">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground">
            Publications récentes
          </h2>
          <Link to="/marketplace" className="text-[10px] sm:text-xs text-primary font-medium">
            Tout voir →
          </Link>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide md:hidden">
          {recentProducts.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[140px]">
              <ProductCard product={product} viewMode="grid" hideProducer />
            </div>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-3">
          {recentProducts.slice(0, 5).map((product) => (
            <div key={product.id}>
              <ProductCard product={product} viewMode="grid" hideProducer />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentPublications;
