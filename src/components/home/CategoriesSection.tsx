import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useMemo } from "react";

const categoryImages: Record<string, string> = {
  agriculture: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop&q=80",
  céréales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop&q=80",
  cereales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop&q=80",
  "légumes & maraîchage": "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&h=300&fit=crop&q=80",
  "légumes": "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&h=300&fit=crop&q=80",
  legumes: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&h=300&fit=crop&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop&q=80",
  tubercules: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400&h=300&fit=crop&q=80",
  élevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=300&fit=crop&q=80",
  elevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=300&fit=crop&q=80",
  aviculture: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop&q=80",
  pisciculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=400&h=300&fit=crop&q=80",
  aquaculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=400&h=300&fit=crop&q=80",
  "pêche & aquaculture": "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=400&h=300&fit=crop&q=80",
  agribusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80",
  agrobusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80",
  foresterie: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop&q=80",
  agroalimentaire: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80",
  "transformation agroalimentaire": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80",
  equipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=300&fit=crop&q=80",
  équipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=300&fit=crop&q=80",
};

const getCategoryImage = (name: string) => {
  const key = name.toLowerCase().trim();
  return categoryImages[key] || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop&q=80";
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
        <div className="container mx-auto px-3 sm:px-4">
          <div className="h-6 w-40 bg-muted rounded mb-4" />
          <div className="border border-border rounded-xl p-3 sm:p-4">
            <div className="flex gap-3 sm:gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[38vw] max-w-[180px] sm:w-[160px] lg:w-[180px]">
                  <div className="rounded-lg bg-muted h-28 sm:h-32 lg:h-36" />
                  <div className="p-2 space-y-1">
                    <div className="h-3 bg-muted rounded w-3/4 mx-auto" />
                    <div className="h-2 bg-muted rounded w-1/2 mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (activeCategories.length === 0) return null;

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

        {/* Horizontal scroll on all devices */}
        <div className="border border-border rounded-xl p-3 sm:p-4">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {activeCategories.map((cat: any) => (
              <Link
                key={cat.id}
                to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}`}
                className="flex-shrink-0 w-[38vw] max-w-[180px] sm:w-[160px] lg:w-[180px] group"
              >
                <div className="overflow-hidden rounded-lg border-l-[3px] border-l-primary bg-card hover:shadow-md transition-shadow">
                  <div className="relative h-28 sm:h-32 lg:h-36 overflow-hidden">
                    <img
                      src={getCategoryImage(cat.name)}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2 sm:p-3 text-center">
                    <h3 className="text-[9px] sm:text-xs font-bold text-foreground uppercase tracking-wide line-clamp-1 leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                      {productCounts[cat.id] || 0} {(productCounts[cat.id] || 0) > 1 ? "produits" : "produit"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
