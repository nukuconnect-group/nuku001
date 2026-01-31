import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { products, categories } from "@/data/marketplace";
import { Grid3X3, List, Plus, Search, Leaf } from "lucide-react";

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [location, setLocation] = useState("Toutes les régions");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.producer.name.toLowerCase().includes(query)
      );
    }

    // Category
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Price
    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Organic
    if (organicOnly) {
      result = result.filter((p) => p.isOrganic);
    }

    // Location
    if (location !== "Toutes les régions") {
      result = result.filter((p) => p.location.includes(location));
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.producer.rating - a.producer.rating);
        break;
      case "recent":
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [searchQuery, selectedCategory, priceRange, organicOnly, location, sortBy]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceRange([0, 500000]);
    setOrganicOnly(false);
    setLocation("Toutes les régions");
    setSortBy("recent");
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      {/* Hero with Carousel */}
      <MarketplaceHero 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
      />

      {/* Main Content */}
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4">
          {/* Categories Filter Bar */}
          <div className="mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="whitespace-nowrap flex-shrink-0"
                >
                  {cat.name}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {cat.count}
                  </Badge>
                </Button>
              ))}
              <Button
                variant={organicOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setOrganicOnly(!organicOnly)}
                className="whitespace-nowrap flex-shrink-0 gap-1"
              >
                <Leaf className="w-3 h-3" />
                Bio
              </Button>
            </div>
          </div>

          <div className="w-full">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{filteredProducts.length}</span> produits trouvés
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Plus récents</SelectItem>
                    <SelectItem value="price-asc">Prix croissant</SelectItem>
                    <SelectItem value="price-desc">Prix décroissant</SelectItem>
                    <SelectItem value="rating">Meilleures notes</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="hidden sm:flex items-center border border-border rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid - Centered and Aligned */}
            {filteredProducts.length > 0 ? (
              <div className="w-full">
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5 lg:gap-6 justify-items-center"
                      : "flex flex-col gap-4"
                  }
                >
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Aucun produit trouvé
                </h3>
                <p className="text-muted-foreground mb-6">
                  Essayez de modifier vos filtres ou votre recherche
                </p>
                <Button variant="outline" onClick={handleReset}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )}

            {/* Load More */}
            {filteredProducts.length > 0 && (
              <div className="text-center mt-10 lg:mt-12">
                <Button variant="outline" size="lg">
                  Charger plus de produits
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Floating CTA */}
      <Button
        variant="hero"
        size="icon"
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full shadow-elevated z-30"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Marketplace;
