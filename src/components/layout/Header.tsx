import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Menu, User, LogOut, LayoutGrid, Search, Globe, ChevronDown, Bell, 
  ChevronRight, MapPin, Truck, CreditCard, Settings, Package, 
  LayoutDashboard, Wallet, DollarSign, Leaf
} from "lucide-react";
import { products as mockProducts } from "@/data/marketplace";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CartIcon from "@/components/cart/CartIcon";
import CartSidebar from "@/components/cart/CartSidebar";
import { useLanguage, type LangCode, type CurrencyCode } from "@/contexts/LanguageContext";
import nukuLogo from "@/assets/nukuconnect-logo-header.png";
import nukuLogoWhite from "@/assets/nukuconnect-logo-white.png";

const languages = [
  { code: "fr" as LangCode, name: "Français", flag: "🇫🇷" },
  { code: "en" as LangCode, name: "English", flag: "🇬🇧" },
  { code: "ewe" as LangCode, name: "Eʋegbe", flag: "🇹🇬" },
  { code: "kab" as LangCode, name: "Kabɩyɛ", flag: "🇹🇬" },
  { code: "wo" as LangCode, name: "Wolof", flag: "🇸🇳" },
];

const currencies = [
  { code: "XOF" as CurrencyCode, name: "Franc CFA", symbol: "FCFA" },
  { code: "USD" as CurrencyCode, name: "Dollar US", symbol: "$" },
  { code: "EUR" as CurrencyCode, name: "Euro", symbol: "€" },
  { code: "GBP" as CurrencyCode, name: "Livre Sterling", symbol: "£" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const { lang, setLang, currency, setCurrency, t, formatPrice } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userLocation, setUserLocation] = useState("Lomé, TG");
  const [customLocation, setCustomLocation] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Search results with product thumbnails and category suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return { products: [], categories: [] };
    const q = searchQuery.toLowerCase();
    const matchedProducts = mockProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.producer.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    ).slice(0, 5);
    const matchedCategories = marketplaceCategories.filter(c =>
      c.name.toLowerCase().includes(q)
    ).slice(0, 3);
    return { products: matchedProducts, categories: matchedCategories };
  }, [searchQuery]);

  const SearchResultsDropdown = ({ className = "" }: { className?: string }) => {
    if (!showSearchResults || !searchQuery.trim() || searchQuery.length < 2) return null;
    const { products: matchedProducts, categories: matchedCategories } = searchResults;
    if (matchedProducts.length === 0 && matchedCategories.length === 0) {
      return (
        <div className={`absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-elevated z-50 p-4 ${className}`}>
          <p className="text-xs text-muted-foreground text-center">Aucun résultat pour "{searchQuery}"</p>
        </div>
      );
    }
    return (
      <div className={`absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden ${className}`}>
        {matchedCategories.length > 0 && (
          <div className="p-2 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 mb-1">Catégories</p>
            {matchedCategories.map(cat => (
              <Link key={cat.id} to={`/marketplace?category=${cat.id}`}
                onClick={() => { setShowSearchResults(false); setSearchQuery(""); }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <cat.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{cat.count} produits</span>
              </Link>
            ))}
          </div>
        )}
        {matchedProducts.length > 0 && (
          <div className="p-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 mb-1">Produits</p>
            {matchedProducts.map(product => (
              <Link key={product.id} to={`/produit/${product.id}`}
                onClick={() => { setShowSearchResults(false); setSearchQuery(""); }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <img src={product.image} alt={product.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{product.producer.name} • {product.location}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-primary">{formatPrice(product.price)}</p>
                  {product.isOrganic && <Leaf className="w-3 h-3 text-green-500 ml-auto" />}
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="border-t border-border p-2">
          <button onClick={() => { navigate(`/marketplace?search=${searchQuery}`); setShowSearchResults(false); }}
            className="w-full text-center text-xs text-primary font-medium py-1.5 hover:bg-muted rounded-lg transition-colors">
            Voir tous les résultats pour "{searchQuery}" →
          </button>
        </div>
      </div>
    );
  };


  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setNotifications(data);
  }, []);

  // Realtime notifications subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("header-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const n = payload.new as any;
        if (n.user_id === user.id) {
          setNotifications(prev => [n, ...prev.slice(0, 9)]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navLinks = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.marketplace"), href: "/marketplace" },
    { label: t("nav.producers"), href: "/producteurs" },
    { label: t("nav.nukuai"), href: "/nuku-ai" },
    { label: t("nav.formations"), href: "/formations" },
    { label: t("nav.traceability"), href: "/tracabilite" },
    { label: t("nav.tracking"), href: "/suivi-livraison" },
    { label: t("nav.about"), href: "/a-propos" },
    { label: t("nav.plans"), href: "/plans" },
    { label: "Contact", href: "/contact" },
    { label: "Centre d'aide", href: "/aide" },
  ];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node) &&
          mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    setProfile(data);
    if (data?.location) setUserLocation(data.location);
    fetchNotifications(userId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t("auth.logout"), description: "À bientôt !" });
    navigate("/");
  };

  const handleSaveLocation = () => {
    if (customLocation.trim()) {
      setUserLocation(customLocation);
      toast({ title: t("header.deliveryLocation"), description: customLocation });
    }
    setLocationDialogOpen(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  const getDashboardLink = () => profile?.user_type === "producer" ? "/dashboard" : "/buyer-dashboard";

  const currentLanguage = languages.find(l => l.code === lang);
  const currentCurrencyData = currencies.find(c => c.code === currency);
  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      {/* Row 1: Top Bar (Desktop) - scrolls away */}
      <div className="hidden lg:block bg-muted/50 border-b border-border z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-8 text-xs">
              <button onClick={() => setLocationDialogOpen(true)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Truck className="w-3.5 h-3.5" />
                <span>{t("header.deliverTo")}</span>
                <span className="font-medium text-foreground">{userLocation}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors text-muted-foreground">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{currentLanguage?.flag} {currentLanguage?.name}</span>
                    <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card">
                    <DropdownMenuLabel>{t("header.language")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {languages.map((l) => (
                      <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className="cursor-pointer text-xs">
                        <span className="mr-2">{l.flag}</span>{l.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-border">|</span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{currentCurrencyData?.symbol} {currency}</span>
                    <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card">
                    <DropdownMenuLabel>{t("header.currency")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {currencies.map((curr) => (
                      <DropdownMenuItem key={curr.code} onClick={() => setCurrency(curr.code)} className="cursor-pointer text-xs">
                        <span className="mr-2">{curr.symbol}</span>{curr.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>


      {/* Sticky part: Row 2 only (main header bar) */}
      <header className="sticky top-0 z-50 bg-primary shadow-sm">
        {/* Row 2: Main Header */}
        <div className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between h-12 sm:h-14 gap-2">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="p-3 border-b border-border bg-primary text-primary-foreground">
                    <SheetTitle className="flex items-center gap-2 text-primary-foreground text-sm">
                      <img src={nukuLogo} alt="NUKUCONNECT" className="w-8 h-8 object-contain rounded-full bg-white p-0.5" />
                      NUKUCONNECT
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-60px)]">
                    <div className="p-2">
                      <button onClick={() => { setIsMenuOpen(false); setLocationDialogOpen(true); }}
                        className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <div className="text-left">
                          <p className="text-[10px] text-muted-foreground">{t("header.deliverTo")}</p>
                          <p className="text-xs font-medium">{userLocation}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />
                      </button>
                      <div className="border-t border-border my-2" />
                      <div className="mb-2">
                        <h4 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">{t("nav.navigation")}</h4>
                        {navLinks.map((link) => (
                          <Link key={link.href + link.label} to={link.href} onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted">
                            <span className="text-xs font-medium">{link.label}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-border my-2" />
                      <div className="mb-2">
                        <h4 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">{t("nav.langCurrency")}</h4>
                        <div className="grid grid-cols-2 gap-2 px-3">
                          <select value={lang} onChange={(e) => setLang(e.target.value as LangCode)}
                            className="text-xs p-2 rounded-lg border border-border bg-background">
                            {languages.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                          </select>
                          <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                            className="text-xs p-2 rounded-lg border border-border bg-background">
                            {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="border-t border-border my-2" />
                      {user ? (
                        <div className="p-2">
                          <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                            <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center overflow-hidden">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-primary-foreground">
                                  {(profile?.full_name || user.email)?.charAt(0)?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-xs">{profile?.full_name || user.email?.split("@")[0]}</p>
                              <p className="text-[10px] text-muted-foreground">{t("auth.myAccount")}</p>
                            </div>
                          </Link>
                          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive mt-2 h-8 text-xs"
                            onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                            <LogOut className="w-3 h-3" />{t("auth.logout")}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2">
                          <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                            <Button variant="hero" className="w-full gap-2 h-9 text-xs">
                              <User className="w-3 h-3" />{t("auth.loginSignup")}
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <img src={nukuLogo} alt="NUKUCONNECT"
                  className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 object-contain rounded-full bg-white p-0.5 hidden sm:block" />
                <img src={nukuLogoWhite} alt="NUKUCONNECT"
                  className="h-9 object-contain sm:hidden" />
                <span className="font-heading font-bold text-sm sm:text-base lg:text-lg text-primary-foreground hidden sm:block">
                  NUKUCONNECT
                </span>
              </Link>

              <div className="hidden lg:flex flex-1 max-w-xl mx-6" ref={searchRef}>
                <div className="relative w-full">
                  <Input type="text" placeholder={t("header.search")} value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                    onFocus={() => setShowSearchResults(true)}
                    className="w-full h-10 pl-4 pr-28 rounded-full bg-primary-foreground text-foreground placeholder:text-muted-foreground border-0 text-sm" />
                  <Button size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full text-xs font-medium"
                    onClick={() => { if (searchQuery) { navigate(`/marketplace?search=${searchQuery}`); setShowSearchResults(false); } }}>
                    <Search className="w-3.5 h-3.5 mr-1.5" />{t("header.searchBtn")}
                  </Button>
                  <SearchResultsDropdown />
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 sm:h-9 sm:w-9">
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-accent-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 bg-card">
                    <div className="flex items-center justify-between px-2 py-1.5 text-sm font-semibold">
                      <span>{t("header.notifications")}</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-primary text-[10px] font-normal">{t("header.readAll")}</button>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Aucune notification</div>
                    ) : notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex items-start gap-2 p-2 cursor-pointer">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.is_read ? 'bg-muted' : 'bg-primary'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{notif.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{notif.description}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {new Date(notif.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="justify-center text-xs text-primary cursor-pointer" onClick={() => navigate("/notifications")}>
                      {t("header.viewAllNotif")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 sm:h-9 sm:w-9">
                        <User className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-card">
                      <div className="p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center overflow-hidden">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-primary-foreground">
                                {(profile?.full_name || user.email)?.charAt(0)?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{profile?.full_name || user.email?.split("@")[0]}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-1">
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to={getDashboardLink()} className="flex items-center gap-2 text-xs">
                            <LayoutDashboard className="w-3.5 h-3.5" />{t("dashboard.title")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to="/messages" className="flex items-center gap-2 text-xs">
                            <Package className="w-3.5 h-3.5" />{t("dashboard.orders")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to="/plans" className="flex items-center gap-2 text-xs">
                            <Wallet className="w-3.5 h-3.5" />{t("dashboard.payments")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to="/suivi-livraison" className="flex items-center gap-2 text-xs">
                            <Truck className="w-3.5 h-3.5" />{t("dashboard.trackOrders")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to="/buyer-dashboard" className="flex items-center gap-2 text-xs">
                            <Settings className="w-3.5 h-3.5" />{t("dashboard.settings")}
                          </Link>
                        </DropdownMenuItem>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer text-xs">
                        <LogOut className="w-3.5 h-3.5 mr-2" />{t("auth.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth">
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 sm:h-9 sm:w-9">
                      <User className="w-4 h-4" />
                    </Button>
                  </Link>
                )}

                <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)}
                  className="relative text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 sm:h-9 sm:w-9">
                  <CartIcon showBadgeOnly />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Row 3: Mobile Search - scrolls away */}
      <div className="lg:hidden bg-primary px-3 pb-2 pt-1" ref={mobileSearchRef}>
        <div className="relative">
          <Input type="text" placeholder={t("header.search")} value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
            onFocus={() => setShowSearchResults(true)}
            className="w-full h-9 pl-4 pr-10 rounded-full bg-primary-foreground/90 text-foreground placeholder:text-muted-foreground border-0 text-xs" />
          <Button size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full"
            onClick={() => { if (searchQuery) { navigate(`/marketplace?search=${searchQuery}`); setShowSearchResults(false); } }}>
            <Search className="w-3.5 h-3.5" />
          </Button>
          <SearchResultsDropdown />
        </div>
      </div>


      {/* Row 4: Desktop Nav - scrolls away */}
      <nav className="hidden lg:block bg-card border-b border-border z-40">
          <div className="container mx-auto px-4">
            <div className="flex items-center h-10 gap-1">
              <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-foreground hover:bg-muted h-8 px-3 text-xs font-medium">
                    <LayoutGrid className="w-4 h-4" />{t("nav.categories")}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="p-3 border-b border-border bg-primary text-primary-foreground">
                    <SheetTitle className="flex items-center gap-2 text-primary-foreground text-sm">
                      <LayoutGrid className="w-4 h-4" />{t("nav.categories")}
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-60px)]">
                    <div className="p-3 grid grid-cols-2 gap-2">
                      {marketplaceCategories.map((category) => (
                        <Link key={category.id} to={`/marketplace?category=${category.id}`} onClick={() => setCategoriesOpen(false)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all text-center group">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <category.icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-xs font-medium">{category.name}</span>
                          <span className="text-[10px] text-muted-foreground">{category.count} {t("mp.products")}</span>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <div className="w-px h-5 bg-border mx-1" />
              <div className="flex items-center gap-0.5 flex-1">
                {navLinks.map((link) => (
                  <Link key={link.href + link.label} to={link.href}
                    className={`px-2.5 py-1.5 text-xs font-medium transition-colors rounded-md ${
                      isActive(link.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted hover:text-primary"
                    }`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
      </nav>

      <CartSidebar open={cartOpen} onOpenChange={setCartOpen} />

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-5 h-5 text-primary" />{t("header.deliveryLocation")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t("header.currentLocation")}</p>
                <p className="text-sm font-medium">{userLocation}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">{t("header.enterAddress")}</label>
              <Input placeholder="Ex: Quartier Bè, Lomé, Togo" value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)} className="text-sm" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 text-xs" onClick={() => setLocationDialogOpen(false)}>{t("header.cancel")}</Button>
              <Button variant="hero" className="flex-1 text-xs" onClick={handleSaveLocation}>{t("header.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
