import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, X, User, LogOut, LayoutGrid, Search, Globe, ChevronDown, MessageSquare } from "lucide-react";
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
import NotificationBell from "@/components/NotificationBell";
import CartIcon from "@/components/cart/CartIcon";
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentLang, setCurrentLang] = useState("fr");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary shadow-md">
      <div className="container mx-auto px-2 sm:px-4">
        {/* Main Header Row */}
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Left - Menu Button */}
          <div className="flex items-center gap-1">
            {/* Mobile Menu Toggle */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
                  <SheetTitle className="flex items-center gap-2 text-primary-foreground">
                    <img src={nukuLogo} alt="NUKUCONNECT" className="w-8 h-8 object-contain" />
                    NUKUCONNECT
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)]">
                  <div className="p-2">
                    {/* Menu / Categories Tabs */}
                    <div className="flex border-b border-border mb-4">
                      <button 
                        className="flex-1 py-3 text-sm font-semibold border-b-2 border-primary text-primary"
                      >
                        MENU
                      </button>
                      <button 
                        className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setCategoriesOpen(true);
                        }}
                      >
                        CATÉGORIES
                      </button>
                    </div>
                    
                    {/* Nav Links */}
                    <nav className="space-y-1">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted text-foreground font-medium transition-all"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                    
                    <div className="border-t border-border my-4" />
                    
                    {/* Quick Links */}
                    <div className="space-y-1">
                      <Link
                        to="/producteurs"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-all"
                      >
                        DEVENIR FOURNISSEUR
                      </Link>
                      <Link
                        to="/marketplace"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-all"
                      >
                        LES MAGASINS
                      </Link>
                      
                      {/* Languages */}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-all">
                          <span>LANGUAGES</span>
                          <ChevronDown className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {languages.map((lang) => (
                            <DropdownMenuItem
                              key={lang.code}
                              onClick={() => setCurrentLang(lang.code)}
                              className="cursor-pointer"
                            >
                              <span className="mr-2">{lang.flag}</span>
                              {lang.name}
                              {currentLang === lang.code && (
                                <span className="ml-auto text-primary">✓</span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="border-t border-border my-4" />
                    
                    {/* Auth Section */}
                    {user ? (
                      <div className="space-y-2 px-2">
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
                          className="w-full justify-start gap-2 text-destructive"
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
                      <div className="px-2 space-y-2">
                        <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                          <Button variant="outline" className="w-full gap-2">
                            <User className="w-4 h-4" />
                            LOGIN / REGISTER
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          {/* Center - Logo */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <img 
              src={nukuLogo} 
              alt="NUKUCONNECT" 
              className="w-8 h-8 lg:w-10 lg:h-10 object-contain"
            />
            <span className="font-heading font-bold text-sm lg:text-lg text-primary-foreground hidden xs:block">
              NUKUCONNECT
            </span>
          </Link>

          {/* Right - Cart Only */}
          <div className="flex items-center gap-1">
            {user && <NotificationBell />}
            <div className="bg-accent rounded-full">
              <CartIcon />
            </div>
          </div>
        </div>

        {/* Search Bar Row */}
        <div className="pb-3" ref={searchRef}>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search for products"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full h-10 pl-4 pr-12 rounded-lg bg-primary-foreground border-0 text-foreground placeholder:text-muted-foreground"
            />
            <Button 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-10 bg-accent hover:bg-accent/90 text-accent-foreground rounded-md"
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
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-elevated z-50 overflow-hidden">
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
      </div>

      {/* Categories Sheet */}
      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
            <SheetTitle className="flex items-center gap-2 text-primary-foreground">
              <LayoutGrid className="w-5 h-5" />
              Catégories
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-2">
              {marketplaceCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/marketplace?category=${category.id}`}
                  onClick={() => setCategoriesOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-all"
                >
                  <category.icon className="w-5 h-5 flex-shrink-0 text-primary" />
                  <span className="flex-1 text-left font-medium">{category.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {category.count}
                  </span>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;
