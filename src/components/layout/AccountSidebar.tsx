import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { getProfileDisplayName } from "@/lib/displayName";
import { useLanguage, type LangCode, type CurrencyCode } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useResolvedUserType } from "@/hooks/useResolvedUserType";
import { useQueryClient } from "@tanstack/react-query";
import { 
  User, Store, Mail, Lock, Eye, EyeOff, Loader2, Phone, MapPin, 
  Building, Briefcase, LogOut, Settings, ShoppingBag, LayoutDashboard,
  Crown, Heart, Shield, ChevronRight, MessageSquare, ShoppingCart,
  HelpCircle, Truck, GraduationCap, BookOpen, Globe, Ticket, Download, Smartphone, Headphones,
  Sun, Moon, Monitor
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";

interface AccountSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const sectors = [
  "Céréales & Légumineuses", "Maraîchage", "Fruits", "Tubercules",
  "Élevage", "Aviculture", "Pêche & Aquaculture", "Transformation agroalimentaire",
];

const countries = [
  "Togo", "Bénin", "Ghana", "Côte d'Ivoire", "Burkina Faso", "Niger", "Mali", "Sénégal",
];

type UserType = "producer" | "buyer" | "driver" | "learner" | "trainer";

const userTypeConfig: { value: UserType; label: string; icon: any; desc: string }[] = [
  { value: "buyer", label: "Acheteur", icon: ShoppingBag, desc: "Acheter des produits" },
  { value: "producer", label: "Fournisseur", icon: Store, desc: "Vendre vos produits" },
  { value: "driver", label: "Livreur", icon: Truck, desc: "Livrer des commandes" },
  { value: "learner", label: "Apprenant", icon: GraduationCap, desc: "Suivre des formations" },
  { value: "trainer", label: "Formateur", icon: BookOpen, desc: "Créer des formations" },
];

const AccountSidebar = ({ isOpen, onClose }: AccountSidebarProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, profile, isLoading: isProfileLoading, isReady } = useProfile();
  const { lang, setLang, currency, setCurrency } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { canInstall, isInstalled, install, showInstallOption } = usePWAInstall();
  const resolvedUserType = useResolvedUserType(user?.id, profile?.user_type);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("buyer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("Togo");

  useEffect(() => {
    if (!isReady) return;

    if (!user?.id) {
      setIsAdmin(false);
      return;
    }

    let active = true;

    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" } as any)
      .then(({ data, error }) => {
        if (active) setIsAdmin(!error && !!data);
      });

    return () => {
      active = false;
    };
  }, [user?.id, isReady]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect."
            : error.message === "Email not confirmed"
              ? "Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception."
              : error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Connexion réussie", description: "Bienvenue sur NUKUCONNECT !" });
      // Stay on current page - just close sidebar, auth state change will refresh data
      onClose();
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const loc = country ? `${location}, ${country}` : location;

      const { data: authData, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            user_type: userType,
            phone,
            location: loc,
            company: ["producer", "trainer"].includes(userType) ? company : null,
            sector: userType === "producer" ? sector : null,
          },
        },
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message.includes("already registered")
            ? "Un compte existe déjà avec cet email."
            : error.message,
          variant: "destructive",
        });
        return;
      }

      const needsConfirmation = authData?.user?.identities && authData.user.identities.length > 0 && !authData.session;

      if (needsConfirmation) {
        toast({
          title: "Inscription réussie ! 🎉",
          description: "Vérifiez votre email pour confirmer votre compte, puis connectez-vous.",
        });
        onClose();
        // Redirect to auth page for login
        window.location.href = "/auth";
        return;
      }

      toast({
        title: "Inscription réussie !",
        description: "Bienvenue sur NUKUCONNECT ! Votre compte est maintenant actif.",
      });
      onClose();
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      queryClient.clear();
      await supabase.auth.signOut();
      toast({ title: "Déconnexion réussie", description: "À bientôt sur NUKUCONNECT !" });
      onClose();
      window.location.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
      onClose();
      window.location.replace("/");
    }
  };

  const getUserTypeLabel = (type?: string) => {
    const map: Record<string, string> = {
      producer: "Fournisseur",
      buyer: "Acheteur",
      driver: "Livreur",
      learner: "Apprenant",
      trainer: "Formateur",
    };
    return map[type || ""] || "Utilisateur";
  };

  const getDashboardHref = () => {
    const t = resolvedUserType;
    if (t === "producer" || t === "trainer") return "/dashboard";
    if (t === "driver") return "/driver-dashboard";
    if (t === "learner") return "/learner-dashboard";
    return "/buyer-dashboard";
  };

  const currentUserType = resolvedUserType || profile?.user_type || "buyer";
  const isProfileRefreshing = Boolean(user && isProfileLoading && !profile);
  const isAccountPending = !isReady;

  const menuItems = [
    { icon: Shield, label: "Administration", href: "/admin", show: isAdmin },
    { icon: LayoutDashboard, label: "Tableau de bord", href: getDashboardHref(), show: true },
    { icon: ShoppingBag, label: "Mes commandes", href: "/buyer-dashboard?tab=orders", show: currentUserType === "buyer" },
    { icon: ShoppingCart, label: "Panier d'achat", href: "/panier", show: currentUserType === "buyer" },
    { icon: Heart, label: "Mes favoris", href: "/favoris", show: currentUserType === "buyer" },
    { icon: MapPin, label: "Adresse de livraison", href: "/adresse-livraison", show: currentUserType === "buyer" },
    { icon: Store, label: "Devenir vendeur", href: "/devenir-fournisseur", show: currentUserType === "buyer" },
    { icon: ShoppingBag, label: "Gérer les commandes", href: "/suivi-livraison", show: currentUserType === "producer" || currentUserType === "trainer" },
    { icon: Crown, label: "Mon abonnement", href: "/plans", show: currentUserType === "producer" || currentUserType === "trainer" },
    { icon: Truck, label: "Livraisons disponibles", href: "/driver-dashboard", show: currentUserType === "driver" },
    { icon: MapPin, label: "Zone de livraison", href: "/driver-dashboard", show: currentUserType === "driver" },
    { icon: GraduationCap, label: "Mes formations", href: "/formations", show: currentUserType === "learner" },
    { icon: BookOpen, label: "Certificats", href: "/formations", show: currentUserType === "learner" },
    { icon: MessageSquare, label: "Messagerie", href: "/messages", show: true, badge: true },
    { icon: GraduationCap, label: "Formations", href: "/formations", show: currentUserType !== "learner" },
    { icon: Truck, label: "Suivi de livraison", href: "/suivi-livraison", show: currentUserType !== "driver" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[85%] sm:max-w-md p-0 flex flex-col h-full overflow-hidden">
        {isAccountPending ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement du compte...</p>
          </div>
        ) : user ? (
          <div className="h-full flex flex-col">
            {/* Header with avatar */}
            <div className="px-4 py-5 border-b border-border pr-12">
              <SheetHeader className="p-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-left text-[15px] font-bold tracking-tight truncate">
                      {getProfileDisplayName(profile, user.email || "Mon compte")}
                    </SheetTitle>
                    <SheetDescription className="flex flex-wrap items-center gap-2 text-left text-[12px] mt-0.5">
                      <span className="font-medium">{getUserTypeLabel(resolvedUserType)}</span>
                      {isProfileRefreshing && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Synchronisation...
                        </span>
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
            </div>

            {/* Premium / Upgrade banner */}
            <SubscriptionBanner userType={currentUserType} onClose={onClose} />

            {/* Menu items - Alibaba style */}
            <nav className="flex-1 overflow-y-auto">
              <div className="py-1">
                {menuItems.filter(item => item.show).map((item) => (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3.5 px-4 py-3 text-foreground hover:bg-muted/50 transition-colors border-b border-border/20"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-[13px] font-medium tracking-tight text-foreground">{item.label}</span>
                    {item.badge && (
                      <span className="w-2.5 h-2.5 rounded-full bg-destructive flex-shrink-0" />
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </Link>
                ))}
              </div>

              {/* Separator */}
              <div className="h-2 bg-muted/40" />

              {/* PWA Install */}
              {showInstallOption && (
                <div className="py-1">
                  <button
                    onClick={async () => {
                      if (canInstall) {
                        const result = await install();
                        if (result === true) {
                          toast({ title: "Application installée !", description: "NUKUCONNECT est maintenant sur votre écran d'accueil." });
                        } else if (result === false) {
                          toast({ title: "Installation annulée", description: "Vous pouvez réessayer à tout moment." });
                        }
                      } else {
                        // Show manual instructions without opening new tab
                        toast({
                          title: "Installer NUKUCONNECT",
                          description: "Sur Android : Menu ⋮ → Installer l'application. Sur iPhone : Partager → Sur l'écran d'accueil.",
                        });
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-muted/50 transition-colors border-b border-border/30 w-full"
                  >
                    <Download className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <span className="text-xs font-medium uppercase tracking-wide">Installer l'application</span>
                      <p className="text-[10px] text-muted-foreground">Accès rapide depuis votre téléphone</p>
                    </div>
                    <Smartphone className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                  </button>
                </div>
              )}

              {isInstalled && (
                <div className="py-1">
                  <div className="flex items-center gap-3 px-4 py-2.5 text-foreground border-b border-border/30">
                    <Smartphone className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">✅ Application installée</span>
                  </div>
                </div>
              )}

              <div className="h-2 bg-muted/40" />

              {/* Country */}
              <div className="py-1">
                <div className="px-4 py-3.5 border-b border-border/20">
                  <div className="flex items-center gap-3.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-[13px] font-medium tracking-tight">Pays</span>
                  </div>
                  <div className="ml-12">
                    <p className="text-[12px] text-muted-foreground">📍 {profile?.location || "Togo"}</p>
                  </div>
                </div>

                {/* Help, Support & Settings */}
                <Link to="/aide" onClick={onClose}
                  className="flex items-center gap-3.5 px-4 py-3 text-foreground hover:bg-muted/50 transition-colors border-b border-border/20">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium tracking-tight">Centre d'assistance</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </Link>
                <button
                  onClick={() => { onClose(); window.open("https://wa.me/22891201468", "_blank"); }}
                  className="flex items-center gap-3.5 px-4 py-3 text-foreground hover:bg-muted/50 transition-colors border-b border-border/20 w-full text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[13px] font-medium tracking-tight block">Support WhatsApp</span>
                    <span className="text-[10px] text-muted-foreground">+228 91 20 14 68</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </button>
                <button
                  onClick={() => { onClose(); navigate("/aide?chat=1"); }}
                  className="flex items-center gap-3.5 px-4 py-3 text-foreground hover:bg-muted/50 transition-colors border-b border-border/20 w-full text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Headphones className="w-4 h-4 text-primary" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium tracking-tight">Support client</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </button>
                <Link to="/settings" onClick={onClose}
                  className="flex items-center gap-3.5 px-4 py-3 text-foreground hover:bg-muted/50 transition-colors border-b border-border/20">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium tracking-tight">Paramètres</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </Link>

                {/* Theme selector */}
                <div className="px-4 py-3 border-b border-border/20">
                  <div className="flex items-center gap-3.5 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                      {theme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" /> : theme === "light" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Monitor className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <span className="flex-1 text-[13px] font-medium tracking-tight">Apparence</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 ml-12">
                    {([
                      { value: "light", label: "Clair", Icon: Sun },
                      { value: "dark", label: "Sombre", Icon: Moon },
                      { value: "system", label: "Auto", Icon: Monitor },
                    ] as { value: ThemeMode; label: string; Icon: typeof Sun }[]).map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-md border text-[10px] transition-colors ${
                          theme === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background hover:bg-muted text-foreground"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-border">
              <Button variant="outline" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
                Déconnexion
              </Button>
            </div>
          </div>
        ) : (
          // Not logged in view
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 pt-5 pb-4 border-b border-border flex-shrink-0 pr-12">
              <SheetHeader className="p-0">
                <SheetTitle className="text-left">Mon compte</SheetTitle>
                <SheetDescription className="text-left">Connectez-vous ou créez un compte NUKUCONNECT</SheetDescription>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-5">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sidebar-login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="sidebar-login-email" type="email" placeholder="votre@email.com"
                          value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sidebar-login-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="sidebar-login-password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                          value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10 pr-10" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {isLoading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* Role Selection - All 5 roles */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Je suis — Choisir votre profil</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {userTypeConfig.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setUserType(type.value)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left ${
                              userType === type.value
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <type.icon className={`w-4 h-4 flex-shrink-0 ${userType === type.value ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${userType === type.value ? "text-primary" : "text-foreground"}`}>
                                {type.label}
                              </p>
                              <p className="text-[9px] text-muted-foreground truncate">{type.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Common fields */}
                    <div className="space-y-2">
                      <Label>Nom complet</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom complet" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Ville</Label>
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Votre ville" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Pays</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Conditional fields */}
                    {(userType === "producer" || userType === "trainer") && (
                      <div className="space-y-2">
                        <Label>{userType === "trainer" ? "Organisme / Institution" : "Entreprise"}</Label>
                        <Input value={company} onChange={(e) => setCompany(e.target.value)}
                          placeholder={userType === "trainer" ? "Votre institution" : "Nom de votre entreprise"} />
                      </div>
                    )}
                    {userType === "producer" && (
                      <div className="space-y-2">
                        <Label>Secteur d'activité</Label>
                        <Select value={sector} onValueChange={setSector}>
                          <SelectTrigger><SelectValue placeholder="Choisir un secteur" /></SelectTrigger>
                          <SelectContent>
                            {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="votre@email.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Mot de passe</Label>
                      <Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••" required />
                    </div>

                    <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {isLoading ? "Inscription..." : "Créer mon compte"}
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Un email de confirmation sera envoyé pour activer votre compte.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const planNames: Record<string, string> = {
  free: "Gratuit",
  pro: "Premium Pro",
  business: "Premium Business",
  enterprise: "Premium Entreprise",
};

const SubscriptionBanner = ({ userType, onClose }: { userType: string; onClose: () => void }) => {
  const { subscription, isLoading } = useSubscription();
  const [expanded, setExpanded] = useState(false);

  if (userType !== "producer" && userType !== "trainer") {
    return (
      <div className="px-4 py-2 border-b border-border">
        <Link to="/devenir-fournisseur" onClick={onClose}
          className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
          <Crown className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary">Devenir Premium</span>
            <p className="text-[9px] text-muted-foreground">Vendez vos produits sur NukuConnect</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/60" />
        </Link>
      </div>
    );
  }

  const plan = subscription?.plan || "free";
  const planLabel = planNames[plan] || plan;

  return (
    <div className="px-4 py-2 border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors w-full text-left"
      >
        <Crown className="w-4 h-4 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-foreground">{planLabel}</span>
          {subscription?.status === "active" && (
            <span className="ml-1.5 text-[9px] text-green-600 font-medium">● Actif</span>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground/60 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-1.5 p-2.5 rounded-lg bg-muted/50 space-y-1.5 text-[10px]">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Chargement...
            </div>
          ) : subscription ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium text-foreground">{planLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produits max</span>
                <span className="font-medium text-foreground">{subscription.max_products >= 9999 ? "Illimité" : subscription.max_products}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <span className={`font-medium ${subscription.status === "active" ? "text-green-600" : "text-destructive"}`}>
                  {subscription.status === "active" ? "Actif" : "Inactif"}
                </span>
              </div>
              {plan !== "free" && (
                <Link to="/plans" onClick={onClose} className="block text-center text-[10px] text-primary font-medium mt-1 hover:underline">
                  Gérer mon abonnement →
                </Link>
              )}
              {plan === "free" && (
                <Link to="/plans" onClick={onClose} className="block text-center text-[10px] text-primary font-medium mt-1 hover:underline">
                  Passer à Premium →
                </Link>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-1">Aucun abonnement</p>
              <Link to="/plans" onClick={onClose} className="text-primary font-medium hover:underline">
                Choisir un plan →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountSidebar;
