import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

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

  // Products by category for mega menu thumbnails
  const productsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    activeCategories.forEach((cat: any) => {
      const catName = cat.name.toLowerCase();
      map[cat.id] = products
        .filter((p: any) => p.category?.toLowerCase() === catName)
        .slice(0, 4);
    });
    return map;
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

        {/* Mobile: horizontal scroll with images */}
        {isMobile ? (
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
                <div className="overflow-hidden rounded-xl bg-card hover:shadow-md transition-all border border-border/50 hover:border-primary/30">
                  <div className="relative h-24 overflow-hidden">
                    <img
                      src={getCategoryImage(cat.name)}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
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
        ) : (
          /* Desktop: text-only grid with mega menu on hover */
          <div className="relative">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {activeCategories.map((cat: any) => (
                <div
                  key={cat.id}
                  className="relative"
                  onMouseEnter={() => setHoveredCat(cat.id)}
                  onMouseLeave={() => setHoveredCat(null)}
                >
                  <Link
                    to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}`}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left group ${
                      hoveredCat === cat.id
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-border/50 bg-card hover:border-primary/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {cat.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {productCounts[cat.id] || 0} produit{(productCounts[cat.id] || 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                  </Link>

                  {/* Mega menu dropdown on hover */}
                  {hoveredCat === cat.id && (
                    <div
                      className="absolute top-full left-0 mt-1 z-50 w-72 bg-card border border-border rounded-xl shadow-elevated p-3 space-y-3"
                      onMouseEnter={() => setHoveredCat(cat.id)}
                      onMouseLeave={() => setHoveredCat(null)}
                    >
                      {/* Subcategories */}
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Sous-catégories</p>
                          <div className="flex flex-wrap gap-1">
                            {cat.subcategories.map((sub: string) => (
                              <Link
                                key={sub}
                                to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}&sub=${encodeURIComponent(sub)}`}
                                className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                {sub}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Product thumbnails */}
                      {productsByCategory[cat.id]?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Produits populaires</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {productsByCategory[cat.id].map((p: any) => (
                              <Link
                                key={p.id}
                                to={`/produit/${p.id}`}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                              >
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-medium truncate">{p.name}</p>
                                  <p className="text-[9px] text-primary font-bold">{p.price?.toLocaleString()} F</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link
                        to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}`}
                        className="block text-center text-[10px] text-primary font-semibold py-1.5 hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        Voir tous les produits →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoriesSection;
