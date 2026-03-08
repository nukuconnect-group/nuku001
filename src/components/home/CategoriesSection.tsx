import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import catAgriculture from "@/assets/cat-agriculture.jpg";
import catAgroalimentaire from "@/assets/cat-agroalimentaire.jpg";
import catElevage from "@/assets/cat-elevage.jpg";
import catAquaculture from "@/assets/cat-aquaculture.jpg";
import catFruits from "@/assets/cat-fruits-legumes.jpg";
import catDefault from "@/assets/cat-default.jpg";

const categoryImages: Record<string, string> = {
  agriculture: catAgriculture,
  agroalimentaire: catAgroalimentaire,
  élevage: catElevage,
  elevage: catElevage,
  aquaculture: catAquaculture,
  pisciculture: catAquaculture,
  "fruits & légumes": catFruits,
  "fruits et légumes": catFruits,
  fruits: catFruits,
  légumes: catFruits,
};

const getCategoryImage = (name: string) => {
  const key = name.toLowerCase().trim();
  return categoryImages[key] || catDefault;
};

const CategoriesSection = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { data: products = [] } = useProducts();

  const activeCategories = categories.filter((c: any) => c.is_active).slice(0, 12);

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
        <div className="container mx-auto px-3 sm:px-4 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (activeCategories.length === 0) return null;

  return (
    <section className="py-6 sm:py-10 bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="mb-4 sm:mb-6">
          <h2 className="font-heading text-lg sm:text-xl lg:text-2xl font-extrabold text-primary uppercase tracking-wide">
            Top Catégories
          </h2>
          <div className="w-24 h-1 bg-primary mt-1.5 rounded-full" />
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 scrollbar-hide md:hidden">
          {activeCategories.map((cat: any) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${encodeURIComponent(cat.name)}`}
              className="flex-shrink-0 w-[46vw] max-w-[200px] group"
            >
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={getCategoryImage(cat.name)}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 text-center">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide line-clamp-2 leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {productCounts[cat.id] || 0} {(productCounts[cat.id] || 0) > 1 ? "produits" : "produit"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {activeCategories.map((cat: any) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${encodeURIComponent(cat.name)}`}
              className="group"
            >
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={getCategoryImage(cat.name)}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 text-center">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide line-clamp-2">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {productCounts[cat.id] || 0} {(productCounts[cat.id] || 0) > 1 ? "produits" : "produit"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
