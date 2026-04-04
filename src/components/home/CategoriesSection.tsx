import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";

const CategoriesSection = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { data: products = [] } = useProducts();

  const activeCategories = categories.filter((c: any) => c.is_active).slice(0, 16);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeCategories.forEach((cat: any) => {
      const catName = cat.name.toLowerCase();
      counts[cat.id] = products.filter(
        (p: any) => p.category?.toLowerCase() === catName
      ).length;
    });
    return counts;
  }, [activeCategories, products]);

  if (isLoading) {
    return (
      <section className="py-6 sm:py-10 bg-background">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="h-6 w-40 bg-muted rounded mb-4" />
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 border-b border-border animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (activeCategories.length === 0) return null;

  return (
    <section className="py-6 sm:py-10 bg-background">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="mb-4 sm:mb-5">
          <h2 className="font-heading text-lg sm:text-xl lg:text-2xl font-extrabold text-accent uppercase tracking-wide">
            Top Catégories
          </h2>
          <div className="w-20 h-[3px] bg-primary mt-1.5 rounded-full" />
        </div>

        {/* Clean text list */}
        <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border">
          {activeCategories.map((cat: any) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}`}
              className="flex items-center gap-3 px-4 py-3 sm:py-3.5 hover:bg-muted/40 transition-colors group"
            >
              <span className="text-lg sm:text-xl flex-shrink-0 w-7 text-center">{cat.emoji || "📦"}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] sm:text-sm font-semibold text-foreground tracking-wide line-clamp-1">
                  {cat.name}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-muted-foreground tabular-nums flex-shrink-0">
                {productCounts[cat.id] || 0} produit{(productCounts[cat.id] || 0) > 1 ? "s" : ""}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
