import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, User, LogOut, LayoutGrid, Search, Globe, ChevronDown, Bell, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import CartIcon from "@/components/cart/CartIcon";
import CartSidebar from "@/components/cart/CartSidebar";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";
import { products } from "@/data/marketplace";
import nukuLogo from "@/assets/nukuconnect-logo.png";

const languages = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ewe", name: "Eʋegbe", flag: "🇹🇬" },
  { code: "kab", name: "Kabɩyɛ", flag: "🇹🇬" },
  { code: "wo", name: "Wolof", flag: "🇸🇳" },
];

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Producteurs", href: "/producteurs" },
  { label: "NUKU AI", href: "/nuku-ai" },
  { label: "Formations", href: "/formations" },
  { label: "Traçabilité", href: "/tracabilite" },
  { label: "Tarifs", href: "/plans" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentLang, setCurrentLang] = useState("fr");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt sur NUKUCONNECT !",
    });
    navigate("/");
  };

  const getDashboardLink = () => {
    if (profile?.user_type === "producer") {
      return "/dashboard";
    }
    return "/buyer-dashboard";
  };

  const filteredProducts = searchQuery.length >= 2 
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const currentLanguage = languages.find(l => l.code === currentLang);
  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-card shadow-md border-b border-border">
        {/* Top Bar - Desktop Navigation */}
        <div className="hidden lg:block bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-10 text-sm">
              <div className="flex items-center gap-6">
                <span className="opacity-80">Bienvenue sur NUKUCONNECT</span>
                <span className="flex items-center gap-1 opacity-80">
                  📍 Livraison: DHL International | Gozem Togo
                </span>
              </div>
              <div className="flex items-center gap-4">
                {/* Language Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 hover:opacity-80">
                    <Globe className="w-4 h-4" />
                    {currentLanguage?.flag} {currentLanguage?.name}
                    <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card">
                    {languages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setCurrentLang(lang.code)}
                        className="cursor-pointer"
                      >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Auth */}
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80">
                      <User className="w-4 h-4" />
                      {profile?.full_name || user.email?.split("@")[0]}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card">
                      <DropdownMenuItem asChild>
                        <Link to={getDashboardLink()}>Mon tableau de bord</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth" className="hover:opacity-80">
                    Connexion / Inscription
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Header Row */}
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-16 lg:h-20 gap-4">
            {/* Left - Menu Button (Mobile) / Categories (Desktop) */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu */}
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
                    <SheetTitle className="flex items-center gap-2 text-primary-foreground">
                      <img src={nukuLogo} alt="NUKUCONNECT" className="w-10 h-10 object-contain" />
                      NUKUCONNECT
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="p-2">
                      {/* Categories */}
                      <div className="mb-4">
                        <h4 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                          Catégories
                        </h4>
                        {marketplaceCategories.slice(0, 6).map((cat) => (
                          <Link
                            key={cat.id}
                            to={`/marketplace?category=${cat.id}`}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-muted"
                          >
                            <cat.icon className="w-4 h-4 text-primary" />
                            <span className="text-sm">{cat.name}</span>
                          </Link>
                        ))}
                      </div>
                      
                      <div className="border-t border-border my-2" />
                      
                      {/* Nav Links */}
                      <div className="mb-4">
                        <h4 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                          Navigation
                        </h4>
                        {navLinks.map((link) => (
                          <Link
                            key={link.href}
                            to={link.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-muted"
                          >
                            <span className="text-sm font-medium">{link.label}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                      
                      <div className="border-t border-border my-2" />
                      
                      {/* Languages */}
                      <div className="mb-4">
                        <h4 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                          Langue
                        </h4>
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => setCurrentLang(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-muted text-left ${
                              currentLang === lang.code ? "bg-primary/10 text-primary" : ""
                            }`}
                          >
                            <span>{lang.flag}</span>
                            <span className="text-sm">{lang.name}</span>
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t border-border my-2" />
                      
                      {/* Auth Section */}
                      {user ? (
                        <div className="p-2">
                          <Link
                            to={getDashboardLink()}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center overflow-hidden">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-primary-foreground">
                                  {(profile?.full_name || user.email)?.charAt(0)?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{profile?.full_name || user.email?.split("@")[0]}</p>
                              <p className="text-xs text-muted-foreground">Mon compte</p>
                            </div>
                          </Link>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-2 text-destructive mt-2"
                            onClick={() => {
                              handleLogout();
                              setIsMenuOpen(false);
                            }}
                          >
                            <LogOut className="w-4 h-4" />
                            Déconnexion
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2">
                          <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                            <Button variant="hero" className="w-full gap-2">
                              <User className="w-4 h-4" />
                              Connexion / Inscription
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Desktop Categories Button */}
              <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <SheetTrigger asChild className="hidden lg:flex">
                  <Button variant="outline" className="gap-2 bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground">
                    <LayoutGrid className="w-5 h-5" />
                    Catégories
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-96 p-0">
                  <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
                    <SheetTitle className="flex items-center gap-2 text-primary-foreground">
                      <LayoutGrid className="w-5 h-5" />
                      Toutes les Catégories
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {marketplaceCategories.map((category) => (
                        <Link
                          key={category.id}
                          to={`/marketplace?category=${category.id}`}
                          onClick={() => setCategoriesOpen(false)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all text-center group"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <category.icon className="w-6 h-6 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{category.name}</span>
                          <span className="text-xs text-muted-foreground">{category.count} produits</span>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>

            {/* Center - Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img 
                src={nukuLogo} 
                alt="NUKUCONNECT" 
                className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain"
              />
              <span className="font-heading font-bold text-lg sm:text-xl lg:text-2xl text-primary hidden sm:block">
                NUKUCONNECT
              </span>
            </Link>

            {/* Right - Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notifications - Desktop */}
              {user && (
                <Button variant="ghost" size="icon" className="hidden sm:flex text-foreground hover:bg-muted relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
                    3
                  </span>
                </Button>
              )}
              
              {/* Account - Desktop */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="hidden sm:flex">
                    <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
                      <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-primary-foreground">
                            {(profile?.full_name || user.email)?.charAt(0)?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card">
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()} className="cursor-pointer">
                        Mon tableau de bord
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/messages" className="cursor-pointer">
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Cart Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCartOpen(true)}
                className="relative text-foreground hover:bg-muted"
              >
                <CartIcon showBadgeOnly />
              </Button>
            </div>
          </div>

          {/* Search Bar Row */}
          <div className="pb-3 lg:pb-4" ref={searchRef}>
            <div className="relative max-w-2xl mx-auto">
              <Input
                type="text"
                placeholder="Rechercher des produits, catégories, vendeurs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full h-11 lg:h-12 pl-4 pr-14 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
              <Button 
                size="icon" 
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                onClick={() => {
                  if (searchQuery) {
                    navigate(`/marketplace?search=${searchQuery}`);
                    setShowSearchResults(false);
                  }
                }}
              >
                <Search className="w-5 h-5" />
              </Button>
              
              {/* Search Results Dropdown */}
              {showSearchResults && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
                  {filteredProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/produit/${product.id}`}
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                    >
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {new Intl.NumberFormat("fr-FR").format(product.price)} FCFA
                      </span>
                    </Link>
                  ))}
                  <Link
                    to={`/marketplace?search=${searchQuery}`}
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchQuery("");
                    }}
                    className="block p-3 text-center text-sm text-primary font-medium hover:bg-muted border-t border-border"
                  >
                    Voir tous les résultats →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center justify-center gap-1 pb-3 border-t border-border pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Cart Sidebar */}
      <CartSidebar open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
};

export default Header;
