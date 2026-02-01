import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import { CategorySidebar, MobileCategorySidebar, marketplaceCategories } from "@/components/marketplace/CategorySidebar";
import AddProductModal from "@/components/dashboard/AddProductModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { products } from "@/data/marketplace";
import { Grid3X3, List, Plus, Search, Leaf, SlidersHorizontal, MapPin, X, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const locations = [
  "Toutes les régions",
  "Lomé",
  "Kara",
  "Sokodé",
  "Kpalimé",
  "Atakpamé",
  "Dapaong",
  "Tsévié",
];

const Marketplace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [location, setLocation] = useState("Toutes les régions");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [categorySidebarOpen, setCategorySidebarOpen] = useState(false);
  
  // Add product modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, []);

  const handleAddProductClick = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour publier un produit",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    if (profile?.user_type !== "producer") {
      toast({
        title: "Compte producteur requis",
        description: "Créez un compte producteur pour vendre vos produits",
      });
      navigate("/auth");
      return;
    }
    
    setShowAddProduct(true);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (organicOnly) count++;
    if (verifiedOnly) count++;
    if (location !== "Toutes les régions") count++;
    if (priceRange[0] > 0 || priceRange[1] < 500000) count++;
    return count;
  }, [selectedCategory, organicOnly, verifiedOnly, location, priceRange]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.producer.name.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => 
        p.category === selectedCategory || 
        p.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    if (organicOnly) {
      result = result.filter((p) => p.isOrganic);
    }

    if (verifiedOnly) {
      result = result.filter((p) => p.producer.verified);
    }

    if (location !== "Toutes les régions") {
      result = result.filter((p) => p.location.includes(location));
    }

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
  }, [searchQuery, selectedCategory, priceRange, organicOnly, verifiedOnly, location, sortBy]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceRange([0, 500000]);
    setOrganicOnly(false);
    setVerifiedOnly(false);
    setLocation("Toutes les régions");
    setSortBy("recent");
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="space-y-4">
        <Label className="text-sm font-semibold">
          Prix: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])} FCFA
        </Label>
        <Slider
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          min={0}
          max={500000}
          step={5000}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 FCFA</span>
          <span>500K FCFA</span>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Localisation
        </Label>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            Produits bio uniquement
          </Label>
          <Switch checked={organicOnly} onCheckedChange={setOrganicOnly} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Vendeurs vérifiés uniquement
          </Label>
          <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        </div>
      </div>

      {/* Reset */}
      <Button variant="outline" onClick={handleReset} className="w-full">
        Réinitialiser les filtres
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      <MarketplaceHero 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
      />

      <div className="flex">
        {/* Desktop Category Sidebar */}
        <CategorySidebar 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Mobile Category Sidebar */}
        <MobileCategorySidebar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          open={categorySidebarOpen}
          onOpenChange={setCategorySidebarOpen}
        />

        {/* Main Content */}
        <section className="flex-1 py-8 lg:py-12">
          <div className="container mx-auto px-4 lg:pl-8">
            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {/* Categories Button (Mobile) */}
              <Button 
                variant="outline" 
                className="lg:hidden gap-2"
                onClick={() => setCategorySidebarOpen(true)}
              >
                <LayoutGrid className="w-4 h-4" />
                Catégories
              </Button>

              {/* Filter Button */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtres
                    {activeFiltersCount > 0 && (
                      <Badge variant="default" className="ml-1 px-2 py-0 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader className="pb-6">
                    <SheetTitle className="flex items-center gap-2">
                      <SlidersHorizontal className="w-5 h-5" />
                      Filtres avancés
                    </SheetTitle>
                  </SheetHeader>
                  <FiltersContent />
                </SheetContent>
              </Sheet>

              {/* Quick Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1">
                <Button
                  variant={organicOnly ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setOrganicOnly(!organicOnly)}
                  className="whitespace-nowrap flex-shrink-0 gap-1 text-xs"
                >
                  <Leaf className="w-3 h-3" />
                  Bio
                </Button>
                <Button
                  variant={verifiedOnly ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className="whitespace-nowrap flex-shrink-0 text-xs"
                >
                  Vérifiés
                </Button>
              </div>

              {/* Location Quick Select */}
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="w-40 hidden md:flex">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtres actifs:</span>
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {marketplaceCategories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                    <button onClick={() => setSelectedCategory("all")}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {organicOnly && (
                  <Badge variant="secondary" className="gap-1">
                    Bio
                    <button onClick={() => setOrganicOnly(false)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {verifiedOnly && (
                  <Badge variant="secondary" className="gap-1">
                    Vérifiés
                    <button onClick={() => setVerifiedOnly(false)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {location !== "Toutes les régions" && (
                  <Badge variant="secondary" className="gap-1">
                    {location}
                    <button onClick={() => setLocation("Toutes les régions")}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                  Tout effacer
                </Button>
              </div>
            )}

            {/* Results Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{filteredProducts.length}</span> produits trouvés
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
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
                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-5 lg:gap-6 justify-items-center"
                    : "flex flex-col gap-4"
                }
              >
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
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

            {filteredProducts.length > 0 && (
              <div className="text-center mt-10 lg:mt-12">
                <Button variant="outline" size="lg">
                  Charger plus de produits
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Add Button */}
      <Button
        variant="hero"
        size="icon"
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full shadow-elevated z-30"
        onClick={handleAddProductClick}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Add Product Modal */}
      {profile && (
        <AddProductModal
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          profileId={profile.id}
          onProductAdded={() => {
            toast({
              title: "Produit publié !",
              description: "Votre produit est visible sur le marketplace",
            });
          }}
        />
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Marketplace;
