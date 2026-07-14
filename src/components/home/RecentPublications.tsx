import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useActiveBoosts } from "@/hooks/useBoosts";
import ProductCard from "@/components/marketplace/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";

const RecentPublications = () => {
  const { data: products } = useProducts();
  const { data: activeBoosts = [] } = useActiveBoosts();
  const { t } = useLanguage();

  // Merge boosted products with recent ones: alternate boosted with recent
  // so sponsored slots stay visible and rotate as active_boosts changes.
  const feed = useMemo(() => {
    const all = products || [];
    if (all.length === 0) return [];
    const boostedIds = new Set(activeBoosts.map((b) => b.product_id));
    const boosted = all.filter((p) => boostedIds.has(p.id));
    const regular = all.filter((p) => !boostedIds.has(p.id));

    // Rotate boosted + regular so each refresh shows a different order.
    const shuffledBoost = [...boosted].sort(() => Math.random() - 0.5);
    const shuffledReg = [...regular].sort(() => Math.random() - 0.5);

    // Sponsored FIRST (priority), then regulars interleaved with remaining boosts every 3.
    const merged: typeof all = [];
    // Priority slot: up to 2 sponsored at the top
    const topBoosts = shuffledBoost.splice(0, Math.min(2, shuffledBoost.length));
    merged.push(...topBoosts);

    let bi = 0;
    for (let i = 0; i < shuffledReg.length && merged.length < 12; i++) {
      merged.push(shuffledReg[i]);
      if ((i + 1) % 3 === 0 && bi < shuffledBoost.length) {
        merged.push(shuffledBoost[bi++]);
      }
    }
    while (bi < shuffledBoost.length && merged.length < 12) merged.push(shuffledBoost[bi++]);
    return merged.slice(0, 10);
  }, [products, activeBoosts]);

  if (feed.length === 0) return null;

  return (
    <section className="px-3 sm:px-0 py-3 sm:py-5 bg-background">
      <div className="sm:container sm:mx-auto sm:px-4">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground">
            {t("home.recentPublications")}
          </h2>
          <Link to="/marketplace" className="text-[10px] sm:text-xs text-primary font-medium">
            {t("mp.seeAll")}
          </Link>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide md:hidden">
          {feed.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[140px]">
              <ProductCard product={product} viewMode="grid" hideProducer />
            </div>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-3">
          {feed.slice(0, 5).map((product) => (
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
