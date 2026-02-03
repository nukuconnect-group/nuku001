import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import AddProductModal from "@/components/dashboard/AddProductModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";
import { Grid3X3, List, Plus, Search, Leaf, SlidersHorizontal, MapPin, X } from "lucide-react";
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [location, setLocation] = useState("Toutes les régions");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  
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

  // Handle URL params changes
  useEffect(() => {
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    if (category) setSelectedCategory(category);
    if (search) setSearchQuery(search);
  }, [searchParams]);

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
    setProductSearch("");
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  // Products filtered for the filter dropdown
  const productOptions = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 10);
  }, [productSearch]);

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Product Search */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Rechercher un produit
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nom du produit..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {productSearch && productOptions.length > 0 && (
          <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
            {productOptions.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSearchQuery(p.name);
                  setProductSearch("");
                  setFiltersOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left text-sm"
              >
                <img src={p.image} alt="" className="w-8 h-8 rounded object-cover" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Catégories
        </Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            {marketplaceCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <cat.icon className="w-4 h-4" />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
    <div className="min-h-screen bg-background pb-20 lg:pb-0 pt-28 sm:pt-32">
      <Header />

      <MarketplaceHero 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
      />

      {/* Main Content */}
      <section className="py-6 sm:py-8 lg:py-12">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Toolbar */}
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filter Button */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden xs:inline">Filtres</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="default" className="ml-1 px-1.5 py-0 text-[10px]">
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
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 flex-1">
              <Button
                variant={organicOnly ? "default" : "secondary"}
                size="sm"
                onClick={() => setOrganicOnly(!organicOnly)}
                className="whitespace-nowrap flex-shrink-0 gap-1 text-[10px] sm:text-xs px-2 sm:px-3"
              >
                <Leaf className="w-3 h-3" />
                Bio
              </Button>
              <Button
                variant={verifiedOnly ? "default" : "secondary"}
                size="sm"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className="whitespace-nowrap flex-shrink-0 text-[10px] sm:text-xs px-2 sm:px-3"
              >
                Vérifiés
              </Button>
              
              {/* Category Quick Filters */}
              {marketplaceCategories.slice(0, 4).map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)}
                  className="whitespace-nowrap flex-shrink-0 gap-1 text-[10px] sm:text-xs px-2 sm:px-3"
                >
                  <cat.icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{cat.name}</span>
                </Button>
              ))}
            </div>

            {/* Location Quick Select - Hidden on mobile */}
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-32 sm:w-40 hidden md:flex text-xs sm:text-sm">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
            <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Filtres:</span>
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs">
                  {marketplaceCategories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                  <button onClick={() => setSelectedCategory("all")}>
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </Badge>
              )}
              {organicOnly && (
                <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs">
                  Bio
                  <button onClick={() => setOrganicOnly(false)}>
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </Badge>
              )}
              {verifiedOnly && (
                <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs">
                  Vérifiés
                  <button onClick={() => setVerifiedOnly(false)}>
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </Badge>
              )}
              {location !== "Toutes les régions" && (
                <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs">
                  {location}
                  <button onClick={() => setLocation("Toutes les régions")}>
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-[10px] sm:text-xs h-6 px-2">
                Effacer
              </Button>
            </div>
          )}

          {/* Results Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filteredProducts.length}</span> produits
            </p>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[160px] text-xs sm:text-sm">
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
                  className={`p-1.5 sm:p-2 rounded-md transition-colors ${
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 sm:p-2 rounded-md transition-colors ${
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 justify-items-center"
                  : "flex flex-col gap-3 sm:gap-4"
              }
            >
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
                Essayez de modifier vos filtres
              </p>
              <Button variant="outline" onClick={handleReset} size="sm">
                Réinitialiser
              </Button>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="text-center mt-8 sm:mt-10 lg:mt-12">
              <Button variant="outline" size="lg" className="text-sm">
                Charger plus de produits
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Floating Add Button - Hidden on mobile since we have the bottom nav button */}
      <Button
        variant="hero"
        size="icon"
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-elevated z-30 hidden lg:flex"
        onClick={handleAddProductClick}
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
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
