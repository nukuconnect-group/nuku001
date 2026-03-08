import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  Crown, Heart, Shield
} from "lucide-react";

interface AccountSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const sectors = [
  "Céréales & Légumineuses",
  "Maraîchage",
  "Fruits",
  "Tubercules",
  "Élevage",
  "Aviculture",
  "Pêche & Aquaculture",
  "Transformation agroalimentaire",
];

const countries = [
  "Togo", "Bénin", "Ghana", "Côte d'Ivoire", "Burkina Faso", "Niger", "Mali", "Sénégal",
];

const AccountSidebar = ({ isOpen, onClose }: AccountSidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [userType, setUserType] = useState<"producer" | "buyer">("buyer");
  const [producerName, setProducerName] = useState("");
  const [producerPhone, setProducerPhone] = useState("");
  const [producerLocation, setProducerLocation] = useState("");
  const [producerCompany, setProducerCompany] = useState("");
  const [producerSector, setProducerSector] = useState("");
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [buyerLastName, setBuyerLastName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerLocation, setBuyerLocation] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("Togo");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
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

  const fetchProfile = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    ]);
    setProfile(profileRes.data);
    setIsAdmin(!!roleRes.data);
  };

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
            : error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Connexion réussie", description: "Bienvenue sur NUKUCONNECT !" });
      onClose();
    } catch (error) {
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
      const fullName = userType === "producer" ? producerName : `${buyerFirstName} ${buyerLastName}`;
      const phone = userType === "producer" ? producerPhone : buyerPhone;
      const location = userType === "producer" ? producerLocation : `${buyerLocation}, ${buyerCountry}`;

      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            user_type: userType,
            phone: phone,
            location: location,
            company: userType === "producer" ? producerCompany : null,
            sector: userType === "producer" ? producerSector : null,
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

      toast({ title: "Inscription réussie !", description: "Bienvenue sur NUKUCONNECT !" });
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie", description: "À bientôt sur NUKUCONNECT !" });
    onClose();
    navigate("/");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard", show: profile?.user_type === "producer" },
    { icon: Heart, label: "Mes Favoris", href: "/favoris", show: true },
    { icon: ShoppingBag, label: "Mes commandes", href: "/orders", show: true },
    { icon: Settings, label: "Paramètres", href: "/settings", show: true },
    { icon: Crown, label: "Plans & Tarifs", href: "/plans", show: true },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {user ? (
          // Logged in user view
          <div className="h-full flex flex-col">
            <SheetHeader className="pb-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <SheetTitle className="text-left">{profile?.full_name || user.email}</SheetTitle>
                  <SheetDescription className="text-left">
                    {profile?.user_type === "producer" ? "Fournisseur" : "Acheteur"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <nav className="flex-1 py-6 space-y-1">
              {menuItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="pt-6 border-t border-border">
              <Button variant="outline" className="w-full justify-start gap-3 text-destructive" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
                Déconnexion
              </Button>
            </div>
          </div>
        ) : (
          // Login/Signup view
          <div>
            <SheetHeader className="pb-6">
              <SheetTitle>Mon compte</SheetTitle>
              <SheetDescription>Connectez-vous ou créez un compte NUKUCONNECT</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Je suis</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setUserType("producer")}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          userType === "producer" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <User className={`w-5 h-5 mx-auto mb-1 ${userType === "producer" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${userType === "producer" ? "text-primary" : "text-foreground"}`}>Fournisseur</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserType("buyer")}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          userType === "buyer" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Store className={`w-5 h-5 mx-auto mb-1 ${userType === "buyer" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${userType === "buyer" ? "text-primary" : "text-foreground"}`}>Acheteur</span>
                      </button>
                    </div>
                  </div>

                  {userType === "producer" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Nom complet</Label>
                        <Input value={producerName} onChange={(e) => setProducerName(e.target.value)} placeholder="Votre nom complet" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input value={producerPhone} onChange={(e) => setProducerPhone(e.target.value)} placeholder="+228 XX XX XX XX" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Localisation</Label>
                        <Input value={producerLocation} onChange={(e) => setProducerLocation(e.target.value)} placeholder="Ville, Région" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Entreprise</Label>
                        <Input value={producerCompany} onChange={(e) => setProducerCompany(e.target.value)} placeholder="Nom de votre entreprise" />
                      </div>
                      <div className="space-y-2">
                        <Label>Secteur d'activité</Label>
                        <Select value={producerSector} onValueChange={setProducerSector}>
                          <SelectTrigger><SelectValue placeholder="Choisir un secteur" /></SelectTrigger>
                          <SelectContent>
                            {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Prénom</Label>
                          <Input value={buyerFirstName} onChange={(e) => setBuyerFirstName(e.target.value)} placeholder="Prénom" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Nom</Label>
                          <Input value={buyerLastName} onChange={(e) => setBuyerLastName(e.target.value)} placeholder="Nom" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="+228 XX XX XX XX" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Ville</Label>
                        <Input value={buyerLocation} onChange={(e) => setBuyerLocation(e.target.value)} placeholder="Votre ville" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Pays</Label>
                        <Select value={buyerCountry} onValueChange={setBuyerCountry}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
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
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {isLoading ? "Inscription..." : "Créer mon compte"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AccountSidebar;
