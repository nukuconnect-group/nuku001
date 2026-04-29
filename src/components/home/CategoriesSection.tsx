import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useMemo, useRef } from "react";
import imgAgriculture from "@/assets/category-agriculture-modern.jpg";
import imgCereals from "@/assets/category-cereals-modern.jpg";
import imgVegetables from "@/assets/category-vegetables-modern.jpg";
import imgFruits from "@/assets/category-fruits-modern.jpg";
import imgLivestock from "@/assets/category-livestock-modern.jpg";
import imgAquaculture from "@/assets/category-aquaculture-modern.jpg";
import imgEquipment from "@/assets/category-equipment-modern.jpg";

const categoryImages: Record<string, string> = {
  agriculture: imgAgriculture,
  céréales: imgCereals,
  cereales: imgCereals,
  "légumes & maraîchage": imgVegetables,
  "légumes": imgVegetables,
  legumes: imgVegetables,
  fruits: imgFruits,
  tubercules: imgVegetables,
  élevage: imgLivestock,
  elevage: imgLivestock,
  aviculture: imgLivestock,
  pisciculture: imgAquaculture,
  aquaculture: imgAquaculture,
  "pêche & aquaculture": imgAquaculture,
  agribusiness: imgEquipment,
  agrobusiness: imgEquipment,
  foresterie: imgAgriculture,
  agroalimentaire: imgEquipment,
  "transformation agroalimentaire": imgEquipment,
  equipement: imgEquipment,
  équipement: imgEquipment,
};

const getCategoryImage = (name: string) => {
  const key = name.toLowerCase().trim();
  return categoryImages[key] || imgAgriculture;
};

const CategoriesSection = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { data: products = [] } = useProducts();
  const scrollRef = useRef<HTMLDivElement>(null);

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
        <div className="container mx-auto px-3 sm:px-4">
          <div className="h-6 w-40 bg-muted rounded mb-4" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[38vw] max-w-[180px] sm:w-[160px]">
                <div className="rounded-lg bg-muted h-28 sm:h-32" />
                <div className="p-2 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4 mx-auto" />
                  <div className="h-2 bg-muted rounded w-1/2 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (activeCategories.length === 0) return null;

  // Same card layout for all screen sizes (mobile style everywhere)
  return (
    <section className="py-6 sm:py-10 bg-background">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg sm:text-xl lg:text-2xl font-extrabold text-accent uppercase tracking-wide">
              Top Catégories
            </h2>
            <div className="w-20 h-[3px] bg-primary mt-1.5 rounded-full" />
          </div>
          <Link
            to="/categories"
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Voir tout
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Link>
        </div>

        {/* Horizontal scroll on mobile, grid on tablet/desktop — same card style */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        >
          {activeCategories.map((cat: any) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}`}
              className="flex-shrink-0 w-[38vw] max-w-[160px] snap-start group"
            >
              <div className="overflow-hidden rounded-none sm:rounded-none bg-card hover:shadow-md transition-all border border-border/50 hover:border-primary/30">
                <div className="relative h-24 sm:h-28 overflow-hidden">
                  <img
                    src={cat.image_url || getCategoryImage(cat.name)}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-wide line-clamp-1 leading-tight drop-shadow-md">
                      {cat.name}
                    </h3>
                  </div>
                </div>
                <div className="px-2 py-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">
                    {productCounts[cat.id] || 0} produit{(productCounts[cat.id] || 0) > 1 ? "s" : ""}
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
