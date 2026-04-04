import SEO from "@/components/SEO";
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import CompareDrawer from "@/components/marketplace/CompareDrawer";
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
import { ScrollArea } from "@/components/ui/scroll-area";

import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useActiveBoosts, isProductBoosted } from "@/hooks/useBoosts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import VoiceSearchModal from "@/components/search/VoiceSearchModal";
import ImageSearchModal from "@/components/search/ImageSearchModal";
import { Grid3X3, List, Search, Leaf, SlidersHorizontal, MapPin, X, ChevronRight, ChevronLeft, Flame, Star, Sparkles, Award, Loader2, TrendingUp, Percent, PackageCheck, ShieldCheck, Mic, Camera, QrCode, HandCoins, Package, Globe } from "lucide-react";
import QRScanner from "@/components/QRScanner";
import CreateDemandModal from "@/components/marketplace/CreateDemandModal";
import DemandsList from "@/components/marketplace/DemandsList";
import { useDemands } from "@/hooks/useDemands";
import { Product } from "@/data/marketplace";
import { ProductGridSkeleton } from "@/components/marketplace/ProductCardSkeleton";
import MarketplacePromoPopup from "@/components/marketplace/MarketplacePromoPopup";

const locationsByCountry: { country: string; flag: string; cities: string[] }[] = [
  // Afrique de l'Ouest
  { country: "Togo", flag: "🇹🇬", cities: ["Lomé", "Kara", "Sokodé", "Kpalimé", "Atakpamé", "Dapaong", "Tsévié"] },
  { country: "Bénin", flag: "🇧🇯", cities: ["Cotonou", "Porto-Novo", "Parakou", "Abomey", "Natitingou"] },
  { country: "Ghana", flag: "🇬🇭", cities: ["Accra", "Kumasi", "Tamale", "Cape Coast", "Sekondi-Takoradi"] },
  { country: "Côte d'Ivoire", flag: "🇨🇮", cities: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Daloa"] },
  { country: "Sénégal", flag: "🇸🇳", cities: ["Dakar", "Saint-Louis", "Thiès", "Ziguinchor", "Kaolack"] },
  { country: "Burkina Faso", flag: "🇧🇫", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"] },
  { country: "Mali", flag: "🇲🇱", cities: ["Bamako", "Sikasso", "Mopti", "Ségou"] },
  { country: "Niger", flag: "🇳🇪", cities: ["Niamey", "Zinder", "Maradi", "Agadez"] },
  { country: "Guinée", flag: "🇬🇳", cities: ["Conakry", "Kankan", "Nzérékoré", "Kindia"] },
  { country: "Guinée-Bissau", flag: "🇬🇼", cities: ["Bissau", "Bafatá", "Gabú"] },
  { country: "Sierra Leone", flag: "🇸🇱", cities: ["Freetown", "Bo", "Kenema"] },
  { country: "Liberia", flag: "🇱🇷", cities: ["Monrovia", "Buchanan", "Gbarnga"] },
  { country: "Gambie", flag: "🇬🇲", cities: ["Banjul", "Serekunda"] },
  { country: "Cap-Vert", flag: "🇨🇻", cities: ["Praia", "Mindelo"] },
  { country: "Nigeria", flag: "🇳🇬", cities: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"] },
  { country: "Mauritanie", flag: "🇲🇷", cities: ["Nouakchott", "Nouadhibou"] },
  // Afrique Centrale
  { country: "Cameroun", flag: "🇨🇲", cities: ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Maroua"] },
  { country: "RDC", flag: "🇨🇩", cities: ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kisangani"] },
  { country: "Congo", flag: "🇨🇬", cities: ["Brazzaville", "Pointe-Noire"] },
  { country: "Gabon", flag: "🇬🇦", cities: ["Libreville", "Port-Gentil", "Franceville"] },
  { country: "Tchad", flag: "🇹🇩", cities: ["N'Djaména", "Moundou", "Abéché"] },
  { country: "Centrafrique", flag: "🇨🇫", cities: ["Bangui", "Bimbo"] },
  { country: "Guinée équatoriale", flag: "🇬🇶", cities: ["Malabo", "Bata"] },
  { country: "São Tomé-et-Príncipe", flag: "🇸🇹", cities: ["São Tomé"] },
  // Afrique de l'Est
  { country: "Kenya", flag: "🇰🇪", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
  { country: "Tanzanie", flag: "🇹🇿", cities: ["Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Zanzibar"] },
  { country: "Rwanda", flag: "🇷🇼", cities: ["Kigali", "Butare", "Gisenyi", "Ruhengeri"] },
  { country: "Ouganda", flag: "🇺🇬", cities: ["Kampala", "Entebbe", "Jinja", "Gulu"] },
  { country: "Éthiopie", flag: "🇪🇹", cities: ["Addis-Abeba", "Dire Dawa", "Bahir Dar", "Hawassa"] },
  { country: "Burundi", flag: "🇧🇮", cities: ["Bujumbura", "Gitega"] },
  { country: "Somalie", flag: "🇸🇴", cities: ["Mogadiscio", "Hargeisa"] },
  { country: "Djibouti", flag: "🇩🇯", cities: ["Djibouti"] },
  { country: "Érythrée", flag: "🇪🇷", cities: ["Asmara", "Keren"] },
  { country: "Soudan", flag: "🇸🇩", cities: ["Khartoum", "Omdurman", "Port-Soudan"] },
  { country: "Soudan du Sud", flag: "🇸🇸", cities: ["Djouba", "Malakal"] },
  // Afrique Australe
  { country: "Afrique du Sud", flag: "🇿🇦", cities: ["Johannesburg", "Le Cap", "Durban", "Pretoria", "Port Elizabeth"] },
  { country: "Mozambique", flag: "🇲🇿", cities: ["Maputo", "Beira", "Nampula", "Quelimane"] },
  { country: "Madagascar", flag: "🇲🇬", cities: ["Antananarivo", "Toamasina", "Antsirabe", "Fianarantsoa"] },
  { country: "Zimbabwe", flag: "🇿🇼", cities: ["Harare", "Bulawayo", "Chitungwiza"] },
  { country: "Zambie", flag: "🇿🇲", cities: ["Lusaka", "Kitwe", "Ndola"] },
  { country: "Malawi", flag: "🇲🇼", cities: ["Lilongwe", "Blantyre", "Mzuzu"] },
  { country: "Botswana", flag: "🇧🇼", cities: ["Gaborone", "Francistown"] },
  { country: "Namibie", flag: "🇳🇦", cities: ["Windhoek", "Walvis Bay"] },
  { country: "Angola", flag: "🇦🇴", cities: ["Luanda", "Huambo", "Lobito"] },
  { country: "Eswatini", flag: "🇸🇿", cities: ["Mbabane", "Manzini"] },
  { country: "Lesotho", flag: "🇱🇸", cities: ["Maseru"] },
  { country: "Maurice", flag: "🇲🇺", cities: ["Port-Louis"] },
  { country: "Comores", flag: "🇰🇲", cities: ["Moroni"] },
  { country: "Seychelles", flag: "🇸🇨", cities: ["Victoria"] },
  // Afrique du Nord
  { country: "Maroc", flag: "🇲🇦", cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger"] },
  { country: "Algérie", flag: "🇩🇿", cities: ["Alger", "Oran", "Constantine", "Annaba"] },
  { country: "Tunisie", flag: "🇹🇳", cities: ["Tunis", "Sfax", "Sousse"] },
  { country: "Égypte", flag: "🇪🇬", cities: ["Le Caire", "Alexandrie", "Gizeh", "Louxor"] },
  { country: "Libye", flag: "🇱🇾", cities: ["Tripoli", "Benghazi", "Misrata"] },
];

const locations = [
  "Toutes les régions",
  ...locationsByCountry.flatMap(g => g.cities),
];

const LocationSearchFilter = ({ location, onLocationChange }: { location: string; onLocationChange: (loc: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return locationsByCountry;
    return locationsByCountry
      .map(g => ({
        ...g,
        cities: g.cities.filter(c => c.toLowerCase().includes(q)),
        countryMatch: g.country.toLowerCase().includes(q),
      }))
      .filter(g => g.cities.length > 0 || g.countryMatch)
      .map(g => g.countryMatch && g.cities.length === 0 ? { ...g, cities: locationsByCountry.find(og => og.country === g.country)?.cities || [] } : g);
  }, [searchTerm]);

  const handleSelect = (loc: string) => {
    onLocationChange(loc);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5" ref={ref}>
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Ville ou pays..."
            value={isOpen ? searchTerm : (location === "Toutes les régions" ? "" : location)}
            onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            className="h-10 text-xs pl-8 pr-8 rounded-full bg-card border-border w-full"
          />
          {location && location !== "Toutes les régions" && !isOpen && (
            <button
              onClick={() => { onLocationChange("Toutes les régions"); setSearchTerm(""); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            <button
              onClick={() => handleSelect("Toutes les régions")}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2 ${location === "Toutes les régions" ? "bg-primary/5 text-primary font-semibold" : ""}`}
            >
              <Globe className="w-3.5 h-3.5" />
              Toutes les régions
            </button>
            <div className="border-t border-border" />
            {filtered.map((group) => (
              <div key={group.country}>
                <div className="px-3 py-1.5 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 sticky top-0">
                  <span>{group.flag}</span>
                  {group.country}
                </div>
                {group.cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleSelect(city)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors pl-7 ${location === city ? "bg-primary/5 text-primary font-semibold" : ""}`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Aucune région trouvée pour "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>
      {/* Quick tags */}
      <div className="flex flex-wrap gap-1">
        {["Lomé", "Accra", "Cotonou", "Abidjan", "Dakar"].map(loc => (
          <button
            key={loc}
            onClick={() => handleSelect(loc)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${location === loc ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"}`}
          >
            {loc}
          </button>
        ))}
      </div>
    </div>
  );
};


const Marketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, formatPrice: fmtPrice } = useLanguage();
  const { toast } = useToast();
  const { data: dbProducts, isLoading } = useProducts();
  const { data: marketplaceCategories = [] } = useCategories();
  const { data: activeBoosts = [] } = useActiveBoosts();
  const { data: allDemands } = useDemands();
  const demandsCount = allDemands?.length || 0;
  
  // Real DB products always first, boosted on top, mock products only as filler at the end
  const allProducts = useMemo(() => {
    const db = dbProducts || [];
    const boostedIds = new Set(activeBoosts.map(b => b.product_id));
    
    // Sort real products: boosted first, then by creation date
    const sortedDb = [...db].sort((a, b) => {
      const aBoost = boostedIds.has(a.id) ? 1 : 0;
      const bBoost = boostedIds.has(b.id) ? 1 : 0;
      if (bBoost !== aBoost) return bBoost - aBoost;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sortedDb;
  }, [dbProducts, activeBoosts]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [location, setLocation] = useState(t("mp.allRegions"));
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [voiceSearchOpen, setVoiceSearchOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [marketView, setMarketView] = useState<"products" | "demands">("products");
  const sponsoredRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, selectedCategory, organicOnly, verifiedOnly, inStockOnly, discountOnly, minRating, location, sortBy, priceRange]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  const handleCompare = (product: Product) => {
    setCompareProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= 4) return prev;
      return [...prev, product];
    });
  };

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
    if (inStockOnly) count++;
    if (discountOnly) count++;
    if (minRating > 0) count++;
    if (location !== t("mp.allRegions") && location !== "Toutes les régions") count++;
    if (priceRange[0] > 0 || priceRange[1] < 500000) count++;
    return count;
  }, [selectedCategory, organicOnly, verifiedOnly, inStockOnly, discountOnly, minRating, location, priceRange, t]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
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
    if (location !== t("mp.allRegions") && location !== "Toutes les régions") result = result.filter(p => p.location.includes(location));
    if (inStockOnly) result = result.filter(p => p.quantity > 0);
    if (discountOnly) result = result.filter(p => p.discount && p.discount > 0);
    if (minRating > 0) result = result.filter(p => p.producer.rating >= minRating);
    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => b.producer.rating - a.producer.rating); break;
      case "popular": result.sort((a, b) => (b.producer.totalSales || 0) - (a.producer.totalSales || 0)); break;
      case "discount": result.sort((a, b) => (b.discount || 0) - (a.discount || 0)); break;
      default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [searchQuery, selectedCategory, priceRange, organicOnly, verifiedOnly, inStockOnly, discountOnly, minRating, location, sortBy, allProducts, t]);

  const featuredProducts = useMemo(() => [...allProducts].sort((a, b) => b.producer.rating - a.producer.rating).slice(0, 6), [allProducts]);
  const flashDeals = useMemo(() => allProducts.filter(p => p.discount && p.discount > 0).slice(0, 6), [allProducts]);
  const newArrivals = useMemo(() => [...allProducts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), [allProducts]);
  const sponsoredProducts = useMemo(() => [...allProducts].sort((a, b) => b.producer.rating - a.producer.rating).slice(0, 8), [allProducts]);

  const productsByCategory = useMemo(() => {
    const grouped: { [key: string]: typeof allProducts } = {};
    allProducts.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });
    return grouped;
  }, [allProducts]);

  const handleReset = () => {
    setSearchQuery(""); setSelectedCategory("all"); setPriceRange([0, 500000]);
    setOrganicOnly(false); setVerifiedOnly(false); setInStockOnly(false);
    setDiscountOnly(false); setMinRating(0); setLocation(t("mp.allRegions"));
    setSortBy("recent"); setProductSearch("");
  };

  const formatPriceShort = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  const productOptions = useMemo(() => {
    if (!productSearch) return allProducts.slice(0, 10);
    return allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 10);
  }, [productSearch, allProducts]);

  const isFiltering = searchQuery || selectedCategory !== "all" || organicOnly || verifiedOnly || (location !== t("mp.allRegions") && location !== "Toutes les régions");

  const scrollSponsored = (dir: "left" | "right") => {
    if (sponsoredRef.current) {
      sponsoredRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
    }
  };

  const topRatedProducts = useMemo(() => 
    [...allProducts].sort((a, b) => b.producer.rating - a.producer.rating).slice(0, 5),
    [allProducts]
  );

  const FiltersContent = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide">Stock Status</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={discountOnly} onChange={(e) => setDiscountOnly(e.target.checked)} className="rounded border-border" />
            <span className="text-xs">En promotion</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="rounded border-border" />
            <span className="text-xs">En stock</span>
          </div>
        </div>
      </div>

      {/* Most appreciated products */}
      {topRatedProducts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide">Produits les plus appréciés</Label>
          <div className="divide-y divide-border">
            {topRatedProducts.map((p) => (
              <button key={p.id} onClick={() => { navigate(`/produit/${p.id}`); setFiltersOpen(false); }}
                className="w-full flex items-center gap-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
                <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-foreground line-clamp-2">{p.name}</h4>
                  <div className="flex items-center gap-0.5 my-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < Math.round(p.producer.rating) ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.originalPrice && <span className="text-[10px] text-muted-foreground line-through">{fmtPrice(p.originalPrice)}</span>}
                    <span className="text-xs font-bold text-primary">{fmtPrice(p.price)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{t("nav.categories")}</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("mp.allCategories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem key="all" value="all" className="text-xs">{t("mp.allCategories")}</SelectItem>
            {marketplaceCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name.toLowerCase()} className="text-xs">{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        <Label className="text-xs font-semibold">{t("mp.price")}: {formatPriceShort(priceRange[0])} - {formatPriceShort(priceRange[1])} FCFA</Label>
        <Slider value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} min={0} max={500000} step={5000} className="py-2" />
      </div>
      <LocationSearchFilter location={location} onLocationChange={setLocation} />
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-accent" />Note minimum</Label>
        <div className="flex gap-1">
          {[0, 3, 3.5, 4, 4.5].map((r) => (
            <button key={r} onClick={() => setMinRating(r)}
              className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] border transition-colors ${minRating === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
              {r === 0 ? "Tous" : <><Star className="w-2.5 h-2.5 fill-current" />{r}+</>}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-primary" />{t("mp.bioOnly")}</Label>
          <Switch checked={organicOnly} onCheckedChange={setOrganicOnly} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />{t("mp.verifiedOnly")}</Label>
          <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        </div>
      </div>
      <Button variant="outline" onClick={handleReset} className="w-full h-9 text-xs">{t("mp.reset")}</Button>
    </div>
  );

  const NewArrivalsSection = ({ products: arrivals }: { products: typeof allProducts }) => {
    if (arrivals.length === 0) return null;
    const hero = arrivals[0];
    const rest = arrivals.slice(1, 5);
    const reviewCount = (r: number) => Math.floor(r * 12);

    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-accent" />
            {t("mp.newArrivals")}
          </h2>
          <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs text-primary gap-1" onClick={() => setSortBy("recent")}>
            {t("mp.viewAll")}<ChevronRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-1.5 sm:gap-2 lg:gap-3">
          {/* Hero card - large featured, spans full width on mobile top row */}
          <Link to={`/produit/${hero.id}`} className="col-span-2 lg:col-span-5 block group">
            <div className="relative min-h-[200px] sm:min-h-[280px] lg:min-h-[340px] rounded-xl overflow-hidden bg-muted">
              <img src={hero.image} alt={hero.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex gap-1 sm:gap-1.5">
                <Badge className="bg-accent text-accent-foreground font-bold text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-md">✨ NOUVEAU</Badge>
                {hero.discount && hero.discount > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground font-bold text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-md">-{hero.discount}%</Badge>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-5">
                <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-primary-foreground/70 font-medium">{hero.category}</span>
                <h3 className="font-heading text-sm sm:text-lg lg:text-xl font-bold text-primary-foreground mb-0.5 sm:mb-1 line-clamp-2">{hero.name}</h3>
                <p className="text-[10px] sm:text-xs text-primary-foreground/80 line-clamp-1 sm:line-clamp-2 mb-1 sm:mb-2">{hero.description}</p>
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < Math.round(hero.producer.rating) ? "text-accent fill-accent" : "text-primary-foreground/30"}`} />
                  ))}
                  <span className="text-[8px] sm:text-[10px] text-primary-foreground/70">({reviewCount(hero.producer.rating)})</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="font-heading text-base sm:text-xl font-bold text-primary-foreground">{fmtPrice(hero.price)}</span>
                    {hero.originalPrice && <span className="text-[9px] sm:text-xs text-primary-foreground/50 line-through">{fmtPrice(hero.originalPrice)}</span>}
                    <span className="text-[8px] sm:text-[10px] text-primary-foreground/60">/{hero.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-primary-foreground/70">
                    <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" /><span className="truncate max-w-[60px] sm:max-w-none">{hero.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Side cards */}
          <div className="col-span-2 lg:col-span-7 grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-3">
            {rest.map((product) => (
              <Link to={`/produit/${product.id}`} key={product.id} className="block group">
                <div className="relative rounded-xl overflow-hidden bg-muted h-full min-h-[140px] sm:min-h-[160px] lg:min-h-[165px]">
                  <img src={product.image} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                  <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                    <Badge className="bg-accent/90 text-accent-foreground font-bold text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 shadow-sm">NEW</Badge>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-2.5 lg:p-3">
                    <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-primary-foreground/60 font-medium">{product.category}</span>
                    <h4 className="font-heading text-[10px] sm:text-xs lg:text-sm font-semibold text-primary-foreground line-clamp-1 mb-0.5">{product.name}</h4>
                    <div className="flex items-center gap-0.5 mb-0.5 sm:mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${i < Math.round(product.producer.rating) ? "text-accent fill-accent" : "text-primary-foreground/20"}`} />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-xs sm:text-sm font-bold text-primary-foreground">{fmtPrice(product.price)}</span>
                      <span className="text-[7px] sm:text-[8px] text-primary-foreground/60 truncate max-w-[40px] sm:max-w-none">{product.location}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ProductSection = ({ title, icon, products: sectionProducts, viewAll }: { title: string; icon: React.ReactNode; products: typeof allProducts; viewAll?: string }) => (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground flex items-center gap-2">{icon}{title}</h2>
        {viewAll && (
          <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs text-primary gap-1" onClick={() => setSelectedCategory(viewAll)}>
            {t("mp.viewAll")}<ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {sectionProducts.slice(0, 5).map((product) => (<ProductCard key={product.id} product={product} viewMode="grid" onCompare={handleCompare} isBoosted={isProductBoosted(activeBoosts, product.id)} />))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <SEO
        url="/marketplace"
        title="Marketplace - Produits Agricoles d'Afrique"
        description="Explorez des milliers de produits agricoles frais et certifiés. Achetez directement aux producteurs vérifiés d'Afrique."
      />
      <Header />
      <MarketplacePromoPopup />

      <section className="bg-muted/30 border-b border-border py-3 sm:py-4">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder={t("header.search")}
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-20 sm:pr-28 h-10 text-sm bg-card border-border rounded-full w-full" />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button type="button" onClick={() => setQrScannerOpen(true)}
                  className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                  <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button type="button" onClick={() => setVoiceSearchOpen(true)}
                  className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button type="button" onClick={() => setImageSearchOpen(true)}
                  className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
            <div className="w-full sm:w-56 flex-shrink-0">
              <LocationSearchFilter location={location} onLocationChange={setLocation} />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Categories - horizontal swipe */}
      <div className="lg:hidden bg-card border-b border-border overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex items-center gap-1.5 px-3 py-2 min-w-max">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              selectedCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground hover:bg-primary/10"
            }`}>
            Tout
          </button>
          {marketplaceCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name.toLowerCase())}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedCategory === category.name.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground hover:bg-primary/10"
              }`}>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products / Demands Toggle */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-0 py-1">
            <button
              onClick={() => setMarketView("products")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                marketView === "products"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Package className="w-3.5 h-3.5" />
              Produits en vente
            </button>
            <button
              onClick={() => setMarketView("demands")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                marketView === "demands"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <HandCoins className="w-3.5 h-3.5" />
              Demandes d'achat
              {demandsCount > 0 && (
                <Badge className="bg-accent text-accent-foreground text-[9px] px-1.5 py-0 ml-1">{demandsCount}</Badge>
              )}
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <section className="py-3 sm:py-6 lg:py-8">
          <div className="container mx-auto px-3 sm:px-4">
            <ProductGridSkeleton count={10} />
          </div>
        </section>
      )}

      {marketView === "demands" ? (
        <section className="py-3 sm:py-6 lg:py-8">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-heading text-[11px] sm:text-sm lg:text-lg font-bold text-foreground flex items-center gap-1 sm:gap-2 min-w-0">
                <HandCoins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0" />
                <span className="truncate">Toutes les demandes d'achat</span>
              </h2>
              <CreateDemandModal />
            </div>
            {/* Search only - no category filter */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une demande..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
            <DemandsList
              searchQuery={searchQuery}
            />
          </div>
        </section>
      ) : (
      <section className="py-3 sm:py-6 lg:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Sponsored Products Slider */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-accent" />{t("mp.sponsored")}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollSponsored("left")}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollSponsored("right")}><ChevronRight className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <div ref={sponsoredRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {sponsoredProducts.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[140px] sm:w-[180px] snap-start">
                  <ProductCard product={product} viewMode="grid" onCompare={handleCompare} isBoosted={isProductBoosted(activeBoosts, product.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5" />{t("mp.filters")}
                  {activeFiltersCount > 0 && (<Badge variant="default" className="ml-1 px-1.5 py-0 text-[9px] h-4">{activeFiltersCount}</Badge>)}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 sm:w-80 flex flex-col p-0">
                <SheetHeader className="p-4 pb-2 flex-shrink-0"><SheetTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="w-4 h-4" />{t("mp.advancedFilters")}</SheetTitle></SheetHeader>
                <ScrollArea className="flex-1 px-4 pb-4">
                  <FiltersContent />
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 sm:w-40 h-8 text-xs"><SelectValue placeholder="Trier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent" className="text-xs">{t("mp.sortRecent")}</SelectItem>
                <SelectItem value="rating" className="text-xs flex items-center gap-1">⭐ Les mieux notés</SelectItem>
                <SelectItem value="popular" className="text-xs">🔥 Les plus populaires</SelectItem>
                <SelectItem value="price-asc" className="text-xs">{t("mp.sortPriceAsc")}</SelectItem>
                <SelectItem value="price-desc" className="text-xs">{t("mp.sortPriceDesc")}</SelectItem>
                <SelectItem value="discount" className="text-xs">💰 Meilleures promos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t("mp.filters")}:</span>
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                  {marketplaceCategories.find(c => c.name.toLowerCase() === selectedCategory)?.name || selectedCategory}
                  <button onClick={() => setSelectedCategory("all")}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              )}
              {organicOnly && (<Badge variant="secondary" className="gap-1 text-[10px] h-5">{t("mp.bio")}<button onClick={() => setOrganicOnly(false)}><X className="w-2.5 h-2.5" /></button></Badge>)}
              {verifiedOnly && (<Badge variant="secondary" className="gap-1 text-[10px] h-5">{t("mp.verified")}<button onClick={() => setVerifiedOnly(false)}><X className="w-2.5 h-2.5" /></button></Badge>)}
              {location !== t("mp.allRegions") && location !== "Toutes les régions" && (<Badge variant="secondary" className="gap-1 text-[10px] h-5">{location}<button onClick={() => setLocation(t("mp.allRegions"))}><X className="w-2.5 h-2.5" /></button></Badge>)}
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-[10px] h-5 px-2">{t("mp.clear")}</Button>
            </div>
          )}

          {isFiltering ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{filteredProducts.length}</span> {t("mp.products")}</p>
                <div className="flex items-center border border-border rounded-lg p-0.5">
                  <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Grid3X3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><List className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {filteredProducts.length > 0 ? (
                <>
                  <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3" : "flex flex-col gap-3"}>
                    {filteredProducts.slice(0, visibleCount).map((product) => (<ProductCard key={product.id} product={product} viewMode={viewMode} onCompare={handleCompare} isBoosted={isProductBoosted(activeBoosts, product.id)} />))}
                  </div>
                  {visibleCount < filteredProducts.length && (
                    <div ref={loadMoreRef} className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3"><Search className="w-6 h-6 text-muted-foreground" /></div>
                  <h3 className="font-heading text-base font-semibold text-foreground mb-1.5">{t("mp.noProducts")}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{t("mp.noProductsDesc")}</p>
                  <Button variant="outline" onClick={handleReset} size="sm" className="text-xs">{t("mp.reset")}</Button>
                </div>
              )}
            </>
          ) : (
            <>

              {flashDeals.length > 0 && (
                <ProductSection title={t("mp.flashDeals")} icon={<Flame className="w-4 h-4 text-destructive" />} products={flashDeals} />
              )}
              <ProductSection title={t("mp.forYou")} icon={<Sparkles className="w-4 h-4 text-primary" />} products={featuredProducts} />
              {/* New Arrivals - Premium Layout */}
              <NewArrivalsSection products={newArrivals} />
              {Object.entries(productsByCategory).slice(0, 4).map(([category, categoryProducts]) => {
                const categoryInfo = marketplaceCategories.find(c => c.name.toLowerCase() === category.toLowerCase());
                const categoryEmoji = categoryInfo?.emoji || "📦";
                return (
                  <ProductSection key={category} title={category} icon={<span className="text-base">{categoryEmoji}</span>} products={categoryProducts} viewAll={categoryInfo?.name?.toLowerCase() || category} />
                );
              })}

              <div className="mt-6 sm:mt-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground">{t("mp.allProducts")}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {allProducts.slice(0, visibleCount).map((product) => (<ProductCard key={product.id} product={product} viewMode="grid" onCompare={handleCompare} isBoosted={isProductBoosted(activeBoosts, product.id)} />))}
                </div>
                {visibleCount < allProducts.length && (
                  <div ref={loadMoreRef} className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
      )}


      <CompareDrawer
        products={compareProducts}
        open={compareOpen}
        onOpenChange={setCompareOpen}
        onRemove={(id) => setCompareProducts((prev) => prev.filter((p) => p.id !== id))}
        onClear={() => { setCompareProducts([]); setCompareOpen(false); }}
      />
      <Footer />
      <MobileBottomNav />

      <VoiceSearchModal
        open={voiceSearchOpen}
        onClose={() => setVoiceSearchOpen(false)}
        onResult={(text) => setSearchQuery(text)}
      />
      <ImageSearchModal
        open={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
        onSearch={(query) => setSearchQuery(query)}
      />
      <QRScanner
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(code) => setSearchQuery(code)}
      />
    </div>
  );
};

export default Marketplace;
