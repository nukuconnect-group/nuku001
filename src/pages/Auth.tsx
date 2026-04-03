import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Store, Mail, Lock, Eye, EyeOff, Loader2, Phone, MapPin, Building, Briefcase, Truck, GraduationCap, BookOpen } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import nukuLogo from "@/assets/nukuconnect-logo-header.png";

const sectors = [
  "Céréales & Légumineuses", "Maraîchage", "Fruits", "Tubercules",
  "Élevage", "Aviculture", "Pêche & Aquaculture", "Transformation agroalimentaire",
];

const countries = [
  "Togo", "Bénin", "Ghana", "Côte d'Ivoire", "Burkina Faso",
  "Niger", "Mali", "Sénégal", "Guinée", "Cameroun",
  "Nigeria", "RDC", "Congo", "Gabon", "Tchad",
  "Mauritanie", "Gambie", "Sierra Leone", "Liberia",
  "Cap-Vert", "Guinée-Bissau", "Guinée équatoriale",
  "São Tomé-et-Príncipe", "Centrafrique",
];

const profileTypes = [
  { type: "buyer" as const, icon: Store, label: "Acheteur", color: "from-blue-500/20 to-blue-600/10 border-blue-500/30", iconColor: "text-blue-600", desc: "Achetez des produits" },
  { type: "producer" as const, icon: User, label: "Fournisseur", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30", iconColor: "text-emerald-600", desc: "Vendez vos produits" },
  { type: "driver" as const, icon: Truck, label: "Livreur", color: "from-amber-500/20 to-amber-600/10 border-amber-500/30", iconColor: "text-amber-600", desc: "Livrez les commandes" },
  { type: "learner" as const, icon: GraduationCap, label: "Apprenant", color: "from-purple-500/20 to-purple-600/10 border-purple-500/30", iconColor: "text-purple-600", desc: "Suivez des formations" },
  { type: "trainer" as const, icon: BookOpen, label: "Formateur", color: "from-rose-500/20 to-rose-600/10 border-rose-500/30", iconColor: "text-rose-600", desc: "Créez des formations" },
];

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [legalSheet, setLegalSheet] = useState<"terms" | "privacy" | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [userType, setUserType] = useState<"producer" | "buyer" | "driver" | "learner" | "trainer">("buyer");
  
  const [producerName, setProducerName] = useState("");
  const [producerPhone, setProducerPhone] = useState("");
  const [producerLocation, setProducerLocation] = useState("");
  const [producerCompany, setProducerCompany] = useState("");
  const [producerSector, setProducerSector] = useState("");
  
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [buyerLastName, setBuyerLastName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerLocation, setBuyerLocation] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("");

  useEffect(() => {
    if (buyerCountry) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const tzCountryMap: Record<string, string> = {
        "Africa/Lome": "Togo", "Africa/Porto-Novo": "Bénin", "Africa/Cotonou": "Bénin",
        "Africa/Accra": "Ghana", "Africa/Abidjan": "Côte d'Ivoire",
        "Africa/Ouagadougou": "Burkina Faso", "Africa/Niamey": "Niger",
        "Africa/Bamako": "Mali", "Africa/Dakar": "Sénégal",
        "Africa/Conakry": "Guinée", "Africa/Douala": "Cameroun",
        "Africa/Lagos": "Nigeria", "Africa/Kinshasa": "RDC",
        "Africa/Brazzaville": "Congo", "Africa/Libreville": "Gabon",
        "Africa/Ndjamena": "Tchad", "Africa/Nouakchott": "Mauritanie",
        "Africa/Banjul": "Gambie", "Africa/Freetown": "Sierra Leone",
        "Africa/Monrovia": "Liberia",
      };
      setBuyerCountry(tzCountryMap[tz] || "Togo");
    } catch { setBuyerCountry("Togo"); }
  }, []);

  useEffect(() => {
    let redirected = false;
    const redirectUser = async (userId: string) => {
      if (redirected) return;
      redirected = true;
      let profileData = null;
      for (let i = 0; i < 4; i++) {
        const { data } = await supabase.from("profiles").select("user_type").eq("user_id", userId).maybeSingle();
        profileData = data;
        if (profileData) break;
        await new Promise(r => setTimeout(r, 800));
      }
      if (profileData?.user_type === "producer" || profileData?.user_type === "trainer") navigate("/dashboard", { replace: true });
      else if (profileData?.user_type === "driver") navigate("/driver-dashboard", { replace: true });
      else if (profileData?.user_type === "learner") navigate("/learner-dashboard", { replace: true });
      else navigate("/buyer-dashboard", { replace: true });
    };
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) redirectUser(session.user.id); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (session && !redirected) redirectUser(session.user.id); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) {
        toast({ title: error.message.includes("Invalid") ? "Erreur de connexion" : "Erreur", description: error.message.includes("Invalid") ? "Email ou mot de passe incorrect." : error.message.includes("not confirmed") ? "Veuillez vérifier votre email." : error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Connexion réussie", description: "Bienvenue sur NUKUCONNECT !" });
    } catch { toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else { toast({ title: "Email envoyé", description: "Vérifiez votre boîte email." }); setForgotMode(false); setForgotEmail(""); }
    } catch { toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicLinkEmail.trim()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: magicLinkEmail, options: { emailRedirectTo: `${window.location.origin}/` } });
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      setMagicLinkSent(true);
      toast({ title: "Lien envoyé !", description: "Vérifiez votre boîte email." });
    } catch { toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (error) toast({ title: "Erreur", description: "Connexion Google échouée.", variant: "destructive" });
    } catch { toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirmPassword) { toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" }); return; }
    if (signupPassword.length < 6) { toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const fullName = (userType === "buyer" || userType === "learner") ? `${buyerFirstName} ${buyerLastName}` : producerName;
      const phone = (userType === "buyer" || userType === "learner") ? buyerPhone : producerPhone;
      const location = (userType === "buyer" || userType === "learner") ? `${buyerLocation}, ${buyerCountry}` : producerLocation;
      const { data: authData, error } = await supabase.auth.signUp({
        email: signupEmail, password: signupPassword,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName, user_type: userType, phone, location, company: userType === "producer" ? producerCompany : null, sector: userType === "producer" ? producerSector : null } },
      });
      if (error) { toast({ title: error.message.includes("already") ? "Email déjà utilisé" : "Erreur", description: error.message.includes("already") ? "Un compte existe déjà. Essayez de vous connecter." : error.message, variant: "destructive" }); return; }
      if (authData.user) {
        // Check if email confirmation is needed (user has identities = email not auto-confirmed)
        const needsConfirmation = authData.user.identities && authData.user.identities.length > 0 && !authData.session;
        
        await supabase.from("profiles").insert({ user_id: authData.user.id, full_name: fullName, user_type: userType, location, bio: userType === "producer" ? `${producerCompany} - ${producerSector}` : userType === "driver" ? `Livreur - ${producerSector || 'moto'}` : null });
        
        if (userType === "driver") {
          const { data: newProfile } = await supabase.from("profiles").select("id").eq("user_id", authData.user.id).maybeSingle();
          if (newProfile) await supabase.from("driver_profiles").insert({ user_id: authData.user.id, profile_id: newProfile.id, vehicle_type: producerSector || "moto", zone: producerLocation, is_available: true });
        }
        
        if (needsConfirmation) {
          toast({ title: "Vérifiez votre email 📧", description: "Un lien de confirmation a été envoyé à votre adresse email. Veuillez cliquer dessus pour activer votre compte." });
          return;
        }
        
        toast({ title: "Inscription réussie !", description: "Bienvenue sur NUKUCONNECT !" });
        if (userType === "producer" || userType === "trainer") navigate("/dashboard");
        else if (userType === "driver") navigate("/driver-dashboard");
        else if (userType === "learner") navigate("/learner-dashboard");
        else navigate("/buyer-dashboard");
      }
    } catch { toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const selectedProfile = profileTypes.find(p => p.type === userType)!;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-6 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-md mx-auto">
            {/* Logo - Professional centered */}
            <div className="text-center mb-6 sm:mb-8">
              <img src={nukuLogo} alt="NUKUCONNECT" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto object-contain mb-4" />
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">NUKUCONNECT</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">La marketplace agricole intelligente</p>
            </div>

            <Card variant="feature">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <CardHeader>
                    <CardTitle>Bienvenue</CardTitle>
                    <CardDescription>Connectez-vous à votre compte NUKUCONNECT</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="login-email" type="email" placeholder="votre@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10 pr-10" required />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); }} className="text-xs text-primary hover:underline">Mot de passe oublié ?</button>
                      </div>
                      <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connexion...</> : "Se connecter"}
                      </Button>
                    </form>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
                    </div>

                    <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogleSignIn} disabled={isLoading}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continuer avec Google
                    </Button>
                  </CardContent>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">
                  <CardHeader>
                    <CardTitle>Créer un compte</CardTitle>
                    <CardDescription>Rejoignez la communauté NUKUCONNECT</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                      {/* User Type Selection - Colored cards */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Je suis — Choisir votre profil</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {profileTypes.map(({ type, icon: Icon, label, color, iconColor, desc }) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setUserType(type)}
                              className={`relative p-3 rounded-xl border-2 transition-all bg-gradient-to-br ${
                                userType === type ? `${color} shadow-md scale-[1.02]` : "border-border hover:border-primary/30 bg-card"
                              }`}
                            >
                              <Icon className={`w-5 h-5 mx-auto mb-1.5 ${userType === type ? iconColor : "text-muted-foreground"}`} />
                              <span className={`text-[10px] font-semibold block leading-tight ${userType === type ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                            </button>
                          ))}
                        </div>
                        {/* Selected profile description */}
                        <div className={`rounded-lg bg-gradient-to-r ${selectedProfile.color} p-2.5 flex items-center gap-2`}>
                          <selectedProfile.icon className={`w-4 h-4 ${selectedProfile.iconColor} flex-shrink-0`} />
                          <p className="text-[11px] text-foreground font-medium">{selectedProfile.desc}</p>
                        </div>
                      </div>

                      {/* Producer / Trainer Fields */}
                      {(userType === "producer" || userType === "trainer") && (
                        <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 p-3">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Informations {userType === "trainer" ? "formateur" : "fournisseur"}
                          </p>
                          <div className="space-y-2">
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="text" placeholder="Nom complet" value={producerName} onChange={(e) => setProducerName(e.target.value)} className="pl-10" required />
                            </div>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="tel" placeholder="+228 XX XX XX XX" value={producerPhone} onChange={(e) => setProducerPhone(e.target.value)} className="pl-10" required />
                            </div>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="text" placeholder="Ville, Région" value={producerLocation} onChange={(e) => setProducerLocation(e.target.value)} className="pl-10" required />
                            </div>
                            <div className="relative">
                              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="text" placeholder={userType === "trainer" ? "Organisme / Institution" : "Entreprise / Exploitation"} value={producerCompany} onChange={(e) => setProducerCompany(e.target.value)} className="pl-10" />
                            </div>
                            <Select value={producerSector} onValueChange={setProducerSector}>
                              <SelectTrigger className="w-full">
                                <Briefcase className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder={userType === "trainer" ? "Domaine d'expertise" : "Secteur d'activité"} />
                              </SelectTrigger>
                              <SelectContent>
                                {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Buyer / Learner Fields */}
                      {(userType === "buyer" || userType === "learner") && (
                        <div className={`space-y-3 rounded-xl border p-3 ${userType === "learner" ? "border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20" : "border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20"}`}>
                          <p className={`text-xs font-semibold flex items-center gap-1.5 ${userType === "learner" ? "text-purple-700 dark:text-purple-400" : "text-blue-700 dark:text-blue-400"}`}>
                            {userType === "learner" ? <GraduationCap className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                            Informations {userType === "learner" ? "apprenant" : "acheteur"}
                          </p>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input type="text" placeholder="Prénom" value={buyerFirstName} onChange={(e) => setBuyerFirstName(e.target.value)} required />
                              <Input type="text" placeholder="Nom" value={buyerLastName} onChange={(e) => setBuyerLastName(e.target.value)} required />
                            </div>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="tel" placeholder="+228 XX XX XX XX" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} className="pl-10" required />
                            </div>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="text" placeholder="Votre ville" value={buyerLocation} onChange={(e) => setBuyerLocation(e.target.value)} className="pl-10" required />
                            </div>
                            <Select value={buyerCountry} onValueChange={setBuyerCountry}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un pays" /></SelectTrigger>
                              <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Driver Fields */}
                      {userType === "driver" && (
                        <div className="space-y-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 p-3">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" /> Informations livreur
                          </p>
                          <div className="space-y-2">
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="text" placeholder="Nom complet" value={producerName} onChange={(e) => setProducerName(e.target.value)} className="pl-10" required />
                            </div>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="tel" placeholder="+228 XX XX XX XX" value={producerPhone} onChange={(e) => setProducerPhone(e.target.value)} className="pl-10" required />
                            </div>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="text" placeholder="Zone d'activité" value={producerLocation} onChange={(e) => setProducerLocation(e.target.value)} className="pl-10" required />
                            </div>
                            <Select value={producerSector || "moto"} onValueChange={setProducerSector}>
                              <SelectTrigger className="w-full">
                                <Truck className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Type de véhicule" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="moto">🏍️ Moto</SelectItem>
                                <SelectItem value="velo">🚲 Vélo</SelectItem>
                                <SelectItem value="voiture">🚗 Voiture</SelectItem>
                                <SelectItem value="tricycle">🛺 Tricycle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Common fields */}
                      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Identifiants de connexion
                        </p>
                        <div className="space-y-2">
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" placeholder="votre@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-10" required />
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type={showPassword ? "text" : "password"} placeholder="Mot de passe" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10 pr-10" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type={showPassword ? "text" : "password"} placeholder="Confirmer le mot de passe" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className="pl-10" required />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <input type="checkbox" id="privacy-policy" required className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                        <label htmlFor="privacy-policy" className="text-xs text-muted-foreground leading-tight">
                          J'accepte les{" "}
                          <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary underline hover:text-primary/80">conditions d'utilisation</button>
                          {" "}et la{" "}
                          <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary underline hover:text-primary/80">politique de confidentialité</button>
                        </label>
                      </div>

                      <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Inscription...</> : "Créer mon compte"}
                      </Button>
                    </form>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
                    </div>

                    <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogleSignIn} disabled={isLoading}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      S'inscrire avec Google
                    </Button>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Forgot password sheet */}
      <Sheet open={forgotMode} onOpenChange={setForgotMode}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Mot de passe oublié</SheetTitle></SheetHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Entrez votre email pour recevoir un lien de réinitialisation.</p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder="votre@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" required />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Envoyer le lien
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Legal preview sheet */}
      <Sheet open={legalSheet !== null} onOpenChange={() => setLegalSheet(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{legalSheet === "terms" ? "Conditions d'utilisation" : "Politique de confidentialité"}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(70vh-80px)] mt-4 pr-4">
            {legalSheet === "terms" ? (
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <h3 className="text-foreground font-semibold">1. Objet</h3>
                <p>Les présentes CGU régissent l'accès et l'utilisation de NUKUCONNECT. En utilisant la plateforme, vous acceptez ces conditions.</p>
                <h3 className="text-foreground font-semibold">2. Accès</h3>
                <p>L'inscription est ouverte à toute personne souhaitant acheter ou vendre des produits agricoles.</p>
                <h3 className="text-foreground font-semibold">3. Services</h3>
                <p>NUKUCONNECT facilite la mise en relation, la vente, la communication et le suivi des commandes.</p>
                <h3 className="text-foreground font-semibold">4. Paiements</h3>
                <p>Les transactions sont effectuées via Paygate Global. NUKUCONNECT peut prélever une commission.</p>
                <h3 className="text-foreground font-semibold">5. Responsabilités</h3>
                <p>NUKUCONNECT agit en tant qu'intermédiaire.</p>
                <h3 className="text-foreground font-semibold">6. Propriété intellectuelle</h3>
                <p>Tous les contenus sont la propriété de Nukuconnect SA.</p>
                <div className="pt-4"><Button variant="outline" size="sm" className="w-full" onClick={() => setLegalSheet(null)}>Fermer</Button></div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <h3 className="text-foreground font-semibold">1. Collecte des données</h3>
                <p>Nous collectons les données nécessaires : nom, email, téléphone, localisation.</p>
                <h3 className="text-foreground font-semibold">2. Utilisation</h3>
                <p>Vos données servent à gérer votre compte et faciliter les transactions.</p>
                <h3 className="text-foreground font-semibold">3. Protection</h3>
                <p>Nous appliquons des mesures de sécurité pour protéger vos données.</p>
                <h3 className="text-foreground font-semibold">4. Partage</h3>
                <p>Vos données ne sont jamais vendues à des tiers.</p>
                <h3 className="text-foreground font-semibold">5. Vos droits</h3>
                <p>Contactez support@nukuconnect.com pour exercer vos droits.</p>
                <div className="pt-4"><Button variant="outline" size="sm" className="w-full" onClick={() => setLegalSheet(null)}>Fermer</Button></div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Auth;
