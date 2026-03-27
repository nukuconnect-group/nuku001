import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

// Realistic Unsplash images for each category
const categoryImages: Record<string, string> = {
  agriculture: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop&q=80",
  céréales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop&q=80",
  cereales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop&q=80",
  "légumes & maraîchage": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&q=80",
  "légumes": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&q=80",
  legumes: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop&q=80",
  tubercules: "https://images.unsplash.com/photo-1518977676601-b53f82ber3db?w=400&h=300&fit=crop&q=80",
  élevage: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop&q=80",
  elevage: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=300&fit=crop&q=80",
  aviculture: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop&q=80",
  pisciculture: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&q=80",
  aquaculture: "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=400&h=300&fit=crop&q=80",
  agribusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80",
  foresterie: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop&q=80",
  agroalimentaire: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop&q=80",
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

        {/* Horizontal scroll on all devices */}
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide">
          {activeCategories.map((cat: any) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}`}
              className="flex-shrink-0 w-[46vw] max-w-[200px] md:w-[180px] lg:w-[200px] group"
            >
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-32 md:h-36 overflow-hidden">
                  <img
                    src={getCategoryImage(cat.name)}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 text-center">
                  <h3 className="text-xs md:text-sm font-bold text-foreground uppercase tracking-wide line-clamp-2 leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
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
