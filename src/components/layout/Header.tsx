 import { useState, useEffect, useRef } from "react";
 import { Link, useNavigate, useLocation } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Menu, User, LogOut, LayoutGrid, Search, Globe, ChevronDown, Bell, ChevronRight, MapPin } from "lucide-react";
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
   const [userLocation, setUserLocation] = useState("Lomé, TG");
   const searchRef = useRef<HTMLDivElement>(null);
   const mobileSearchRef = useRef<HTMLDivElement>(null);
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
       if (searchRef.current && !searchRef.current.contains(event.target as Node) &&
           mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
         setShowSearchResults(false);
       }
     };
     document.addEventListener("mousedown", handleClickOutside);
     return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);
 
   useEffect(() => {
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         () => setUserLocation("Lomé, TG"),
         () => setUserLocation("Lomé, TG")
       );
     }
   }, []);
 
   const fetchProfile = async (userId: string) => {
     const { data } = await supabase
       .from("profiles")
       .select("*")
       .eq("user_id", userId)
       .single();
     setProfile(data);
     if (data?.location) {
       setUserLocation(data.location);
     }
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
       ).slice(0, 5)
     : [];
 
   const currentLanguage = languages.find(l => l.code === currentLang);
   const isActive = (href: string) => location.pathname === href;
 
   const SearchResults = ({ isMobile = false }: { isMobile?: boolean }) => (
     showSearchResults && filteredProducts.length > 0 && (
       <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
         {filteredProducts.slice(0, isMobile ? 4 : 5).map((product) => (
           <Link
             key={product.id}
             to={`/produit/${product.id}`}
             onClick={() => {
               setShowSearchResults(false);
               setSearchQuery("");
             }}
             className="flex items-center gap-2 p-2 hover:bg-muted transition-colors"
           >
             <img 
               src={product.image} 
               alt={product.name}
               className="w-9 h-9 rounded-lg object-cover"
             />
             <div className="flex-1 min-w-0">
               <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
               <p className="text-[10px] text-muted-foreground">{product.category}</p>
             </div>
             <span className="text-xs font-bold text-primary">
               {new Intl.NumberFormat("fr-FR").format(product.price)} F
             </span>
           </Link>
         ))}
         <Link
           to={`/marketplace?search=${searchQuery}`}
           onClick={() => {
             setShowSearchResults(false);
             setSearchQuery("");
           }}
           className="block p-2 text-center text-xs text-primary font-medium hover:bg-muted border-t border-border"
         >
           Voir tous les résultats →
         </Link>
       </div>
     )
   );
 
   return (
     <>
       <header className="sticky top-0 z-50 bg-card shadow-sm">
         {/* Row 1: Main Header */}
         <div className="bg-primary text-primary-foreground">
           <div className="container mx-auto px-3 sm:px-4">
             <div className="flex items-center justify-between h-14 lg:h-16 gap-2">
               {/* Left - Menu */}
               <div className="flex items-center gap-2">
                 <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                   <SheetTrigger asChild className="lg:hidden">
                     <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
                       <Menu className="w-5 h-5" />
                     </Button>
                   </SheetTrigger>
                   <SheetContent side="left" className="w-72 p-0">
                     <SheetHeader className="p-3 border-b border-border bg-primary text-primary-foreground">
                       <SheetTitle className="flex items-center gap-2 text-primary-foreground text-base">
                         <img src={nukuLogo} alt="NUKUCONNECT" className="w-8 h-8 object-contain" />
                         NUKUCONNECT
                       </SheetTitle>
                     </SheetHeader>
                     <ScrollArea className="h-[calc(100vh-60px)]">
                       <div className="p-2">
                         <div className="mb-3">
                           <h4 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                             Catégories
                           </h4>
                           {marketplaceCategories.slice(0, 6).map((cat) => (
                             <Link
                               key={cat.id}
                               to={`/marketplace?category=${cat.id}`}
                               onClick={() => setIsMenuOpen(false)}
                               className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted"
                             >
                               <cat.icon className="w-4 h-4 text-primary" />
                               <span className="text-xs">{cat.name}</span>
                             </Link>
                           ))}
                         </div>
                         <div className="border-t border-border my-2" />
                         <div className="mb-3">
                           <h4 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                             Navigation
                           </h4>
                           {navLinks.map((link) => (
                             <Link
                               key={link.href}
                               to={link.href}
                               onClick={() => setIsMenuOpen(false)}
                               className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted"
                             >
                               <span className="text-xs font-medium">{link.label}</span>
                               <ChevronRight className="w-3 h-3 text-muted-foreground" />
                             </Link>
                           ))}
                         </div>
                         <div className="border-t border-border my-2" />
                         <div className="mb-3">
                           <h4 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                             Langue
                           </h4>
                           {languages.map((lang) => (
                             <button
                               key={lang.code}
                               onClick={() => setCurrentLang(lang.code)}
                               className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-left ${
                                 currentLang === lang.code ? "bg-primary/10 text-primary" : ""
                               }`}
                             >
                               <span>{lang.flag}</span>
                               <span className="text-xs">{lang.name}</span>
                             </button>
                           ))}
                         </div>
                         <div className="border-t border-border my-2" />
                         {user ? (
                           <div className="p-2">
                             <Link
                               to={getDashboardLink()}
                               onClick={() => setIsMenuOpen(false)}
                               className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                             >
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
                                 <p className="text-[10px] text-muted-foreground">Mon compte</p>
                               </div>
                             </Link>
                             <Button 
                               variant="ghost" 
                               className="w-full justify-start gap-2 text-destructive mt-2 h-8 text-xs"
                               onClick={() => {
                                 handleLogout();
                                 setIsMenuOpen(false);
                               }}
                             >
                               <LogOut className="w-3 h-3" />
                               Déconnexion
                             </Button>
                           </div>
                         ) : (
                           <div className="p-2">
                             <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                               <Button variant="hero" className="w-full gap-2 h-9 text-xs">
                                 <User className="w-3 h-3" />
                                 Connexion / Inscription
                               </Button>
                             </Link>
                           </div>
                         )}
                       </div>
                     </ScrollArea>
                   </SheetContent>
                 </Sheet>
 
                 <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                   <SheetTrigger asChild className="hidden lg:flex">
                     <Button variant="ghost" className="gap-2 text-primary-foreground hover:bg-primary-foreground/10 h-9 text-sm">
                       <LayoutGrid className="w-4 h-4" />
                       Toutes les catégories
                     </Button>
                   </SheetTrigger>
                   <SheetContent side="left" className="w-80 p-0">
                     <SheetHeader className="p-3 border-b border-border bg-primary text-primary-foreground">
                       <SheetTitle className="flex items-center gap-2 text-primary-foreground text-sm">
                         <LayoutGrid className="w-4 h-4" />
                         Toutes les Catégories
                       </SheetTitle>
                     </SheetHeader>
                     <ScrollArea className="h-[calc(100vh-60px)]">
                       <div className="p-3 grid grid-cols-2 gap-2">
                         {marketplaceCategories.map((category) => (
                           <Link
                             key={category.id}
                             to={`/marketplace?category=${category.id}`}
                             onClick={() => setCategoriesOpen(false)}
                             className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all text-center group"
                           >
                             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                               <category.icon className="w-5 h-5 text-primary" />
                             </div>
                             <span className="text-xs font-medium">{category.name}</span>
                             <span className="text-[10px] text-muted-foreground">{category.count} produits</span>
                           </Link>
                         ))}
                       </div>
                     </ScrollArea>
                   </SheetContent>
                 </Sheet>
               </div>
 
               {/* Center - Logo */}
               <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
                 <img 
                   src={nukuLogo} 
                   alt="NUKUCONNECT" 
                   className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 object-contain"
                 />
                 <span className="font-heading font-bold text-sm sm:text-base lg:text-lg text-primary-foreground hidden sm:block">
                   NUKUCONNECT
                 </span>
               </Link>
 
               {/* Desktop: Search Bar */}
               <div className="hidden lg:flex flex-1 max-w-lg mx-4" ref={searchRef}>
                 <div className="relative w-full">
                   <Input
                     type="text"
                     placeholder="Rechercher des produits..."
                     value={searchQuery}
                     onChange={(e) => {
                       setSearchQuery(e.target.value);
                       setShowSearchResults(true);
                     }}
                     onFocus={() => setShowSearchResults(true)}
                     className="w-full h-9 pl-4 pr-24 rounded-full bg-primary-foreground text-foreground placeholder:text-muted-foreground border-0 text-sm"
                   />
                   <Button 
                     size="sm" 
                     className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full text-xs font-medium"
                     onClick={() => {
                       if (searchQuery) {
                         navigate(`/marketplace?search=${searchQuery}`);
                         setShowSearchResults(false);
                       }
                     }}
                   >
                     <Search className="w-3 h-3 mr-1" />
                     Rechercher
                   </Button>
                   <SearchResults />
                 </div>
               </div>
 
               {/* Right - Icons */}
               <div className="flex items-center gap-1 sm:gap-2">
                 <div className="hidden lg:flex items-center gap-1 text-primary-foreground/90 text-xs mr-2">
                   <MapPin className="w-3.5 h-3.5" />
                   <div className="leading-tight">
                     <span className="text-[10px] opacity-80">Livraison:</span>
                     <p className="font-medium text-[11px]">{userLocation}</p>
                   </div>
                 </div>
 
                 {user && (
                   <Button variant="ghost" size="icon" className="hidden lg:flex text-primary-foreground hover:bg-primary-foreground/10 relative h-9 w-9">
                     <Bell className="w-4 h-4" />
                     <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-accent-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                       3
                     </span>
                   </Button>
                 )}
                 
                 {user ? (
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild className="hidden lg:flex">
                       <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
                         <User className="w-4 h-4" />
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-44 bg-card">
                       <DropdownMenuItem asChild>
                         <Link to={getDashboardLink()} className="cursor-pointer text-sm">
                           Mon tableau de bord
                         </Link>
                       </DropdownMenuItem>
                       <DropdownMenuItem asChild>
                         <Link to="/messages" className="cursor-pointer text-sm">
                           Messages
                         </Link>
                       </DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer text-sm">
                         <LogOut className="w-3 h-3 mr-2" />
                         Déconnexion
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 ) : (
                   <Link to="/auth" className="hidden lg:flex">
                     <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
                       <User className="w-4 h-4" />
                     </Button>
                   </Link>
                 )}
 
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setCartOpen(true)}
                   className="relative text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
                 >
                   <CartIcon showBadgeOnly />
                 </Button>
               </div>
             </div>
           </div>
         </div>
 
         {/* Row 2: Mobile Search Bar */}
         <div className="lg:hidden bg-card border-b border-border px-3 py-2" ref={mobileSearchRef}>
           <div className="relative">
             <Input
               type="text"
               placeholder="Rechercher des produits..."
               value={searchQuery}
               onChange={(e) => {
                 setSearchQuery(e.target.value);
                 setShowSearchResults(true);
               }}
               onFocus={() => setShowSearchResults(true)}
               className="w-full h-9 pl-4 pr-10 rounded-full bg-muted border-border text-foreground placeholder:text-muted-foreground text-xs"
             />
             <Button 
               size="icon" 
               className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
               onClick={() => {
                 if (searchQuery) {
                   navigate(`/marketplace?search=${searchQuery}`);
                   setShowSearchResults(false);
                 }
               }}
             >
               <Search className="w-3.5 h-3.5" />
             </Button>
             <SearchResults isMobile />
           </div>
         </div>
 
         {/* Row 3: Desktop Navigation */}
         <nav className="hidden lg:block bg-card border-b border-border">
           <div className="container mx-auto px-4">
             <div className="flex items-center justify-center gap-1 h-10">
               {navLinks.map((link) => (
                 <Link
                   key={link.href}
                   to={link.href}
                   className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-lg ${
                     isActive(link.href)
                       ? "bg-primary/10 text-primary"
                       : "text-foreground hover:bg-muted hover:text-primary"
                   }`}
                 >
                   {link.label}
                 </Link>
               ))}
               
               <DropdownMenu>
                 <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
                   <Globe className="w-3.5 h-3.5" />
                   {currentLanguage?.flag}
                   <ChevronDown className="w-3 h-3" />
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="bg-card">
                   {languages.map((lang) => (
                     <DropdownMenuItem
                       key={lang.code}
                       onClick={() => setCurrentLang(lang.code)}
                       className="cursor-pointer text-sm"
                     >
                       <span className="mr-2">{lang.flag}</span>
                       {lang.name}
                     </DropdownMenuItem>
                   ))}
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>
           </div>
         </nav>
       </header>
 
       <CartSidebar open={cartOpen} onOpenChange={setCartOpen} />
     </>
   );
 };
 
 export default Header;