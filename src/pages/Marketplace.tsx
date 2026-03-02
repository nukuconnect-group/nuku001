import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { products } from "@/data/marketplace";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";
import { Grid3X3, List, Search, Leaf, SlidersHorizontal, MapPin, X, ChevronRight, ChevronLeft, Flame, Star, Sparkles, Award } from "lucide-react";

const locations = ["Toutes les régions", "Lomé", "Kara", "Sokodé", "Kpalimé", "Atakpamé", "Dapaong", "Tsévié"];

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const sponsoredRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    if (category) setSelectedCategory(category);
    if (search) setSearchQuery(search);
  }, [searchParams]);

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
      result = result.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.producer.name.toLowerCase().includes(query));
    }
    if (selectedCategory !== "all") {
      result = result.filter(p => p.category === selectedCategory || p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (organicOnly) result = result.filter(p => p.isOrganic);
    if (verifiedOnly) result = result.filter(p => p.producer.verified);
    if (location !== "Toutes les régions") result = result.filter(p => p.location.includes(location));
    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => b.producer.rating - a.producer.rating); break;
      default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [searchQuery, selectedCategory, priceRange, organicOnly, verifiedOnly, location, sortBy]);

  const productsByCategory = useMemo(() => {
    const grouped: { [key: string]: typeof products } = {};
    products.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });
    return grouped;
  }, []);

  const featuredProducts = useMemo(() => [...products].sort((a, b) => b.producer.rating - a.producer.rating).slice(0, 6), []);
  const flashDeals = useMemo(() => products.filter(p => p.discount && p.discount > 0).slice(0, 6), []);
  const newArrivals = useMemo(() => [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4), []);
  const sponsoredProducts = useMemo(() => [...products].sort((a, b) => b.producer.rating - a.producer.rating).slice(0, 8), []);

  const handleReset = () => {
    setSearchQuery(""); setSelectedCategory("all"); setPriceRange([0, 500000]);
    setOrganicOnly(false); setVerifiedOnly(false); setLocation("Toutes les régions");
    setSortBy("recent"); setProductSearch("");
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  const productOptions = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 10);
  }, [productSearch]);

  const popularProducts = useMemo(() => [...products].sort((a, b) => b.producer.rating - a.producer.rating).slice(0, 4), []);

  const isFiltering = searchQuery || selectedCategory !== "all" || organicOnly || verifiedOnly || location !== "Toutes les régions";

  const scrollSponsored = (dir: "left" | "right") => {
    if (sponsoredRef.current) {
      sponsoredRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
    }
  };

  const FiltersContent = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Rechercher un produit</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Nom du produit..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
        {productSearch && productOptions.length > 0 && (
          <div className="max-h-36 overflow-y-auto border border-border rounded-lg">
            {productOptions.map((p) => (
              <button key={p.id} onClick={() => { setSearchQuery(p.name); setProductSearch(""); setFiltersOpen(false); }}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left text-xs">
                <img src={p.image} alt="" className="w-7 h-7 rounded object-cover" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Catégories</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Toutes les catégories" /></SelectTrigger>
          <SelectContent>
            {marketplaceCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="text-xs">
                <span className="flex items-center gap-2"><cat.icon className="w-3.5 h-3.5" />{cat.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-accent" />Produits populaires</Label>
        <div className="grid grid-cols-2 gap-2">
          {popularProducts.map((p) => (
            <button key={p.id} onClick={() => { setSearchQuery(p.name); setFiltersOpen(false); }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:bg-muted transition-colors">
              <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <span className="text-[9px] font-medium text-center line-clamp-2">{p.name}</span>
              <span className="text-[9px] text-primary font-semibold">{formatPrice(p.price)} F</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Prix: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])} FCFA</Label>
        <Slider value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} min={0} max={500000} step={5000} className="py-2" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Localisation</Label>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{locations.map((loc) => (<SelectItem key={loc} value={loc} className="text-xs">{loc}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-primary" />Produits bio uniquement</Label>
          <Switch checked={organicOnly} onCheckedChange={setOrganicOnly} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Vendeurs vérifiés uniquement</Label>
          <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        </div>
      </div>
      <Button variant="outline" onClick={handleReset} className="w-full h-9 text-xs">Réinitialiser les filtres</Button>
    </div>
  );

  const ProductSection = ({ title, icon, products: sectionProducts, viewAll }: { title: string; icon: React.ReactNode; products: typeof products; viewAll?: string }) => (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground flex items-center gap-2">{icon}{title}</h2>
        {viewAll && (
          <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs text-primary gap-1" onClick={() => setSelectedCategory(viewAll)}>
            Voir tout<ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {sectionProducts.slice(0, 5).map((product) => (<ProductCard key={product.id} product={product} viewMode="grid" />))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <MarketplaceHero searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <section className="py-3 sm:py-6 lg:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Sponsored Products Slider */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-accent" />Produits Sponsorisés
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollSponsored("left")}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollSponsored("right")}><ChevronRight className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <div ref={sponsoredRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {sponsoredProducts.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[140px] sm:w-[180px] snap-start">
                  <ProductCard product={product} viewMode="grid" />
                </div>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5" />Filtres
                  {activeFiltersCount > 0 && (<Badge variant="default" className="ml-1 px-1.5 py-0 text-[9px] h-4">{activeFiltersCount}</Badge>)}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 sm:w-80">
                <SheetHeader className="pb-4"><SheetTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="w-4 h-4" />Filtres avancés</SheetTitle></SheetHeader>
                <FiltersContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
              <Button variant={organicOnly ? "default" : "secondary"} size="sm" onClick={() => setOrganicOnly(!organicOnly)} className="whitespace-nowrap flex-shrink-0 gap-1 text-[10px] h-8 px-2.5">
                <Leaf className="w-3 h-3" />Bio
              </Button>
              <Button variant={verifiedOnly ? "default" : "secondary"} size="sm" onClick={() => setVerifiedOnly(!verifiedOnly)} className="whitespace-nowrap flex-shrink-0 text-[10px] h-8 px-2.5">
                Vérifiés
              </Button>
              {marketplaceCategories.slice(1, 4).map((cat) => (
                <Button key={cat.id} variant={selectedCategory === cat.id ? "default" : "secondary"} size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)}
                  className="whitespace-nowrap flex-shrink-0 gap-1 text-[10px] h-8 px-2.5">
                  <cat.icon className="w-3 h-3" /><span className="hidden xs:inline">{cat.name}</span>
                </Button>
              ))}
            </div>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-28 sm:w-36 hidden md:flex h-8 text-xs"><MapPin className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>{locations.map((loc) => (<SelectItem key={loc} value={loc} className="text-xs">{loc}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Filtres:</span>
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                  {marketplaceCategories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                  <button onClick={() => setSelectedCategory("all")}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {organicOnly && (<Badge variant="secondary" className="gap-1 text-[10px] h-5">Bio<button onClick={() => setOrganicOnly(false)}><X className="w-2.5 h-2.5" /></button></Badge>)}
              {verifiedOnly && (<Badge variant="secondary" className="gap-1 text-[10px] h-5">Vérifiés<button onClick={() => setVerifiedOnly(false)}><X className="w-2.5 h-2.5" /></button></Badge>)}
              {location !== "Toutes les régions" && (<Badge variant="secondary" className="gap-1 text-[10px] h-5">{location}<button onClick={() => setLocation("Toutes les régions")}><X className="w-2.5 h-2.5" /></button></Badge>)}
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-[10px] h-5 px-2">Effacer</Button>
            </div>
          )}

          {isFiltering ? (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{filteredProducts.length}</span> produits</p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-36 h-8 text-xs"><SelectValue placeholder="Trier par" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent" className="text-xs">Plus récents</SelectItem>
                      <SelectItem value="price-asc" className="text-xs">Prix croissant</SelectItem>
                      <SelectItem value="price-desc" className="text-xs">Prix décroissant</SelectItem>
                      <SelectItem value="rating" className="text-xs">Meilleures notes</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="hidden sm:flex items-center border border-border rounded-lg p-0.5">
                    <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Grid3X3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><List className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
              {filteredProducts.length > 0 ? (
                <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3" : "flex flex-col gap-3"}>
                  {filteredProducts.map((product) => (<ProductCard key={product.id} product={product} viewMode={viewMode} />))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3"><Search className="w-6 h-6 text-muted-foreground" /></div>
                  <h3 className="font-heading text-base font-semibold text-foreground mb-1.5">Aucun produit trouvé</h3>
                  <p className="text-xs text-muted-foreground mb-4">Essayez de modifier vos filtres</p>
                  <Button variant="outline" onClick={handleReset} size="sm" className="text-xs">Réinitialiser</Button>
                </div>
              )}
            </>
          ) : (
            <>
              {flashDeals.length > 0 && (
                <ProductSection title="Offres Flash" icon={<Flame className="w-4 h-4 text-accent" />} products={flashDeals} />
              )}
              <ProductSection title="Sélection pour vous" icon={<Sparkles className="w-4 h-4 text-primary" />} products={featuredProducts} />
              <ProductSection title="Nouveautés" icon={<Star className="w-4 h-4 text-accent" />} products={newArrivals} />
              {Object.entries(productsByCategory).slice(0, 4).map(([category, categoryProducts]) => {
                const categoryInfo = marketplaceCategories.find(c => c.name.toLowerCase() === category.toLowerCase() || c.id.toLowerCase() === category.toLowerCase());
                const CategoryIcon = categoryInfo?.icon || Grid3X3;
                return (
                  <ProductSection key={category} title={category} icon={<CategoryIcon className="w-4 h-4 text-primary" />} products={categoryProducts} viewAll={categoryInfo?.id || category} />
                );
              })}
              <div className="mt-6 sm:mt-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground">Tous les produits</h2>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Trier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent" className="text-xs">Plus récents</SelectItem>
                      <SelectItem value="price-asc" className="text-xs">Prix croissant</SelectItem>
                      <SelectItem value="price-desc" className="text-xs">Prix décroissant</SelectItem>
                      <SelectItem value="rating" className="text-xs">Meilleures notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {products.map((product) => (<ProductCard key={product.id} product={product} viewMode="grid" />))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Marketplace;
