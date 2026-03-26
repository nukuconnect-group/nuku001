import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
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
import { 
  User, Store, Mail, Lock, Eye, EyeOff, Loader2, Phone, MapPin, 
  Building, Briefcase, LogOut, Settings, ShoppingBag, LayoutDashboard,
  Crown, Heart, Shield, ChevronRight, MessageSquare, ShoppingCart,
  HelpCircle, Truck, GraduationCap, BookOpen, Globe, Ticket
} from "lucide-react";

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
  const { toast } = useToast();
  const { user, profile } = useProfile();
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
    if (user?.id) {
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail, password: loginPassword,
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
      const redirectUrl = `${window.location.origin}/`;
      const loc = country ? `${location}, ${country}` : location;

      const { error } = await supabase.auth.signUp({
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
            ? "Un compte existe déjà avec cet email." : error.message,
          variant: "destructive",
        });
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
      await supabase.auth.signOut();
      toast({ title: "Déconnexion réussie", description: "À bientôt sur NUKUCONNECT !" });
      onClose();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      onClose();
      window.location.href = "/";
    }
  };

  const getUserTypeLabel = (type?: string) => {
    const map: Record<string, string> = {
      producer: "Fournisseur", buyer: "Acheteur", driver: "Livreur",
      learner: "Apprenant", trainer: "Formateur",
    };
    return map[type || ""] || "Utilisateur";
  };

  const getDashboardHref = () => {
    const t = profile?.user_type;
    if (t === "producer" || t === "trainer") return "/dashboard";
    if (t === "driver") return "/driver-dashboard";
    if (t === "learner") return "/formations";
    return "/buyer-dashboard";
  };

  const currentUserType = profile?.user_type;

  const menuItems = [
    { icon: Shield, label: "Administration", href: "/admin", show: isAdmin },
    { icon: LayoutDashboard, label: "Tableau de bord", href: getDashboardHref(), show: true },
    { icon: ShoppingBag, label: "Mes commandes", href: "/suivi-livraison", show: currentUserType === "buyer" },
    { icon: ShoppingCart, label: "Panier d'achat", href: "/panier", show: currentUserType === "buyer" },
    { icon: Heart, label: "Mes favoris", href: "/favoris", show: currentUserType === "buyer" },
    { icon: MapPin, label: "Adresse de livraison", href: "/adresse-livraison", show: currentUserType === "buyer" },
    { icon: Store, label: "Devenir vendeur", href: "/about", show: currentUserType === "buyer" },
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

  const bottomItems = [
    { icon: Globe, label: "Pays/région, devise et langue", href: "/settings", show: true },
    { icon: HelpCircle, label: "Centre d'assistance", href: "/aide", show: true },
    { icon: Settings, label: "Paramètres", href: "/settings", show: true },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[85%] sm:max-w-md overflow-y-auto p-0">
        {user ? (
          <div className="h-full flex flex-col">
            {/* Header with avatar */}
            <div className="px-4 py-5 border-b border-border">
              <SheetHeader className="p-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-left text-base truncate">{profile?.full_name || user.email}</SheetTitle>
                    <SheetDescription className="text-left text-xs">
                      {getUserTypeLabel(profile?.user_type)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
            </div>

            {/* Menu items - Alibaba style */}
            <nav className="flex-1 overflow-y-auto">
              <div className="py-1">
                {menuItems.filter(item => item.show).map((item) => (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3.5 px-4 py-3.5 text-foreground hover:bg-muted/50 transition-colors border-b border-border/30"
                  >
                    <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                  </Link>
                ))}
              </div>

              {/* Separator */}
              <div className="h-2 bg-muted/40" />

              {/* Bottom items */}
              <div className="py-1">
                {bottomItems.filter(item => item.show).map((item) => (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3.5 px-4 py-3.5 text-foreground hover:bg-muted/50 transition-colors border-b border-border/30"
                  >
                    <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                  </Link>
                ))}
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
          <div className="h-full flex flex-col">
            <div className="px-4 pt-5 pb-4 border-b border-border">
              <SheetHeader className="p-0">
                <SheetTitle>Mon compte</SheetTitle>
                <SheetDescription>Connectez-vous ou créez un compte NUKUCONNECT</SheetDescription>
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

export default AccountSidebar;
