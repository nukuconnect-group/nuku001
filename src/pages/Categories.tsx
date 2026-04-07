import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ArrowRight, Package, Loader2, Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const categoryImages: Record<string, string> = {
  agriculture: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop&q=80",
  céréales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop&q=80",
  cereales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop&q=80",
  "légumes & maraîchage": "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&h=400&fit=crop&q=80",
  "légumes": "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&h=400&fit=crop&q=80",
  legumes: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&h=400&fit=crop&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=400&fit=crop&q=80",
  tubercules: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=600&h=400&fit=crop&q=80",
  élevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=400&fit=crop&q=80",
  elevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=400&fit=crop&q=80",
  aviculture: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&h=400&fit=crop&q=80",
  pisciculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&h=400&fit=crop&q=80",
  aquaculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&h=400&fit=crop&q=80",
  agribusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=400&fit=crop&q=80",
  foresterie: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=400&fit=crop&q=80",
  agroalimentaire: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=400&fit=crop&q=80",
  equipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=400&fit=crop&q=80",
  équipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=400&fit=crop&q=80",
};

const getCategoryImage = (name: string) => {
  const key = name.toLowerCase().trim();
  return categoryImages[key] || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop&q=80";
};

const Categories = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { data: products = [] } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const activeCategories = categories.filter((c: any) => c.is_active);

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

  // Collect all unique subcategories
  const allSubcategories = useMemo(() => {
    const subs = new Set<string>();
    activeCategories.forEach((cat: any) => {
      cat.subcategories?.forEach((s: string) => subs.add(s));
    });
    return Array.from(subs).sort();
  }, [activeCategories]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    let result = activeCategories;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((cat: any) =>
        cat.name.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q) ||
        cat.subcategories?.some((s: string) => s.toLowerCase().includes(q))
      );
    }
    if (selectedSubcategory) {
      result = result.filter((cat: any) =>
        cat.subcategories?.includes(selectedSubcategory)
      );
    }
    return result;
  }, [activeCategories, searchQuery, selectedSubcategory]);

  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SEO
        url="/categories"
        title="Toutes les Catégories - Marketplace Agricole"
        description="Explorez toutes les catégories de produits agricoles : céréales, fruits, légumes, élevage, pisciculture et bien plus."
        image="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=630&fit=crop&q=80"
      />
      <Header />

      <main className="py-6 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="mb-6 sm:mb-8">
            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground">
              Toutes les Catégories
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Explorez l'ensemble de nos secteurs agricoles et trouvez les produits qui vous intéressent
            </p>
            <div className="w-20 h-[3px] bg-primary mt-2 rounded-full" />
          </div>

          {/* Search + Subcategory filters */}
          <div className="mb-5 space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8 h-10 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {allSubcategories.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filtrer par sous-catégorie
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant={selectedSubcategory === null ? "default" : "outline"}
                    size="sm"
                    className="text-[10px] h-7 px-3"
                    onClick={() => setSelectedSubcategory(null)}
                  >
                    Toutes
                  </Button>
                  {allSubcategories.map((sub) => (
                    <Button
                      key={sub}
                      variant={selectedSubcategory === sub ? "default" : "outline"}
                      size="sm"
                      className="text-[10px] h-7 px-3"
                      onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
                    >
                      {sub}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {(searchQuery || selectedSubcategory) && (
              <p className="text-xs text-muted-foreground">
                {filteredCategories.length} catégorie{filteredCategories.length > 1 ? "s" : ""} trouvée{filteredCategories.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune catégorie trouvée</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(""); setSelectedSubcategory(null); }}>
                Réinitialiser
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {filteredCategories.map((cat: any) => (
                <Link
                  key={cat.id}
                  to={`/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}`}
                  className="group"
                >
                  <div className="overflow-hidden rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300">
                    <div className="relative h-36 sm:h-44 lg:h-52 overflow-hidden">
                      <img
                        src={getCategoryImage(cat.name)}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="text-2xl sm:text-3xl">{cat.emoji || "📦"}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                        <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-white line-clamp-1">
                          {cat.name}
                        </h2>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      {cat.description && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mb-2">
                          {cat.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Package className="w-3.5 h-3.5" />
                          <span>{productCounts[cat.id] || 0} produits</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                      </div>
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="flex flex-wrap gap-1">
                            {cat.subcategories.slice(0, 4).map((sub: string) => (
                              <span key={sub} className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full ${selectedSubcategory === sub ? "bg-primary/10 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}>
                                {sub}
                              </span>
                            ))}
                            {cat.subcategories.length > 4 && (
                              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                +{cat.subcategories.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Categories;
