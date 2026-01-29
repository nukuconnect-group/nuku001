import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/marketplace/ProductCard";
import MarketplaceFilters from "@/components/marketplace/MarketplaceFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { products } from "@/data/marketplace";
import { Search, SlidersHorizontal, Grid3X3, List, Plus } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-8 bg-gradient-earth">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Marketplace <span className="text-primary">Agricole</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Découvrez des milliers de produits agricoles de qualité directement des producteurs
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher un produit, producteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              <Button variant="hero" size="lg" className="h-12">
                Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            {/* Filters Sidebar */}
            <aside className="w-72 flex-shrink-0 hidden lg:block">
              <MarketplaceFilters
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                organicOnly={organicOnly}
                onOrganicChange={setOrganicOnly}
                location={location}
                onLocationChange={setLocation}
                onReset={handleReset}
              />
            </aside>

            {/* Mobile Filters */}
            <MarketplaceFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              organicOnly={organicOnly}
              onOrganicChange={setOrganicOnly}
              location={location}
              onLocationChange={setLocation}
              onReset={handleReset}
              isMobileOpen={mobileFiltersOpen}
              onMobileClose={() => setMobileFiltersOpen(false)}
            />

            {/* Products */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setMobileFiltersOpen(true)}
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filtres
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredProducts.length}</span> produits trouvés
                  </p>
                </div>

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

              {/* Products Grid */}
              {filteredProducts.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                      : "flex flex-col gap-4"
                  }
                >
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
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
                <div className="text-center mt-10">
                  <Button variant="outline" size="lg">
                    Charger plus de produits
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Floating CTA */}
      <Button
        variant="hero"
        size="icon"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-elevated z-30"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <Footer />
    </div>
  );
};

export default Marketplace;
