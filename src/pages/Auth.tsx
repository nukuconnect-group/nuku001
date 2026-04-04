import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Store, Mail, Lock, Eye, EyeOff, Loader2, Phone, MapPin, Building, Briefcase, Truck, GraduationCap, BookOpen, ArrowLeft, Check } from "lucide-react";
import nukuLogo from "@/assets/nukuconnect-logo-header.png";
import authLoginImg from "@/assets/auth-login-hero.jpg";
import authSignupImg from "@/assets/auth-signup-hero.jpg";

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
  { type: "buyer" as const, icon: Store, label: "Acheteur", desc: "Achetez des produits agricoles auprès de fournisseurs vérifiés", features: ["Recommandations IA", "Suivi de commandes", "Messagerie directe"] },
  { type: "producer" as const, icon: User, label: "Fournisseur", desc: "Vendez vos produits sur la marketplace intelligente", features: ["Gestion de stock", "Statistiques de vente", "Boost produits"] },
  { type: "driver" as const, icon: Truck, label: "Livreur", desc: "Livrez les commandes et gagnez des revenus", features: ["GPS en temps réel", "Revenus transparents", "Attribution intelligente"] },
  { type: "learner" as const, icon: GraduationCap, label: "Apprenant", desc: "Suivez des formations agricoles certifiées", features: ["Cours en ligne", "Certificats", "Communauté"] },
  { type: "trainer" as const, icon: BookOpen, label: "Formateur", desc: "Créez et dispensez des formations agricoles", features: ["Gestion de cours", "Suivi des apprenants", "Revenus formateur"] },
];

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [legalSheet, setLegalSheet] = useState<"terms" | "privacy" | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<"select" | "form">("select");

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

  const returnTo = new URLSearchParams(window.location.search).get("returnTo");

  useEffect(() => {
    let redirected = false;
    const redirectUser = async (userId: string) => {
      if (redirected) return;
      redirected = true;
      if (returnTo) { navigate(returnTo, { replace: true }); return; }
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
  }, [navigate, returnTo]);

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
        const needsConfirmation = authData.user.identities && authData.user.identities.length > 0 && !authData.session;
        await supabase.from("profiles").insert({ user_id: authData.user.id, full_name: fullName, user_type: userType, location, bio: userType === "producer" ? `${producerCompany} - ${producerSector}` : userType === "driver" ? `Livreur - ${producerSector || 'moto'}` : null });
        if (userType === "driver") {
          const { data: newProfile } = await supabase.from("profiles").select("id").eq("user_id", authData.user.id).maybeSingle();
          if (newProfile) await supabase.from("driver_profiles").insert({ user_id: authData.user.id, profile_id: newProfile.id, vehicle_type: producerSector || "moto", zone: producerLocation, is_available: true });
        }
        if (needsConfirmation) {
          toast({ title: "Vérifiez votre email 📧", description: "Un lien de confirmation a été envoyé à votre adresse email." });
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
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Back button - mobile */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-3 left-3 z-30 lg:hidden flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        aria-label="Retour"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      {/* Left side - Hero image */}
      <div className="relative w-full lg:w-1/2 min-h-[200px] sm:min-h-[280px] lg:min-h-screen">
        <img
          src={authMode === "login" ? authLoginImg : authSignupImg}
          alt={authMode === "login" ? "Agriculteurs africains collaborant" : "Marketplace agricole connectée"}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          width={1080}
          height={1920}
          key={authMode}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 lg:bg-gradient-to-r lg:from-black/70 lg:via-black/40 lg:to-transparent" />
        <div className="relative z-10 flex flex-col justify-end lg:justify-center h-full p-5 sm:p-8 lg:p-12 pt-14 lg:pt-12">
          <h1 className="font-heading text-lg sm:text-2xl lg:text-4xl font-bold text-white mb-0.5 lg:mb-3 mt-2 sm:mt-0">NUKUCONNECT</h1>
          <p className="text-[11px] sm:text-sm lg:text-lg text-white/85 max-w-md leading-snug lg:leading-relaxed">
            La marketplace agricole intelligente d'Afrique. Connectez-vous avec des milliers de producteurs et acheteurs.
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 lg:mt-6 lg:flex-col lg:gap-2">
            {["10K+ Producteurs vérifiés", "Livraison intégrée", "Assistant IA agricole"].map(text => (
              <div key={text} className="flex items-center gap-1.5 lg:gap-2 text-white/90 text-[10px] lg:text-sm">
                <Check className="w-3 h-3 lg:w-4 lg:h-4 text-primary flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mode toggle */}
          <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
            <button
              onClick={() => { setAuthMode("login"); setSignupStep("select"); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authMode === "login" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Connexion</button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authMode === "signup" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Inscription</button>
          </div>

          {authMode === "login" ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Bienvenue</h2>
                <p className="text-sm text-muted-foreground mt-1">Connectez-vous à votre compte</p>
              </div>
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
                <Button type="submit" variant="hero" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connexion...</> : "Se connecter"}
                </Button>
              </form>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">ou</span></div>
              </div>
              <Button type="button" variant="outline" className="w-full gap-2 h-11" onClick={handleGoogleSignIn} disabled={isLoading}>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuer avec Google
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pas de compte ?{" "}
                <button onClick={() => setAuthMode("signup")} className="text-primary font-semibold hover:underline">Créer un compte</button>
              </p>
            </div>
          ) : signupStep === "select" ? (
            /* Account Type Selection */
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Créer un compte</h2>
                <p className="text-sm text-muted-foreground mt-1">Choisissez votre type de profil</p>
              </div>
              <div className="space-y-3">
                {profileTypes.map(({ type, icon: Icon, label, desc, features }) => (
                  <button
                    key={type}
                    onClick={() => { setUserType(type); setSignupStep("form"); }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      userType === type ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        userType === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground">{label}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {features.map(f => (
                            <span key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Déjà un compte ?{" "}
                <button onClick={() => setAuthMode("login")} className="text-primary font-semibold hover:underline">Se connecter</button>
              </p>
            </div>
          ) : (
            /* Signup Form */
            <div className="space-y-5">
              <button onClick={() => setSignupStep("select")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />Changer de profil
              </button>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <selectedProfile.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Compte {selectedProfile.label}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedProfile.desc}</p>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                {/* Profile-specific fields */}
                {(userType === "producer" || userType === "trainer") && (
                  <div className="space-y-3">
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
                      <SelectTrigger><Briefcase className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder={userType === "trainer" ? "Domaine d'expertise" : "Secteur d'activité"} /></SelectTrigger>
                      <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {(userType === "buyer" || userType === "learner") && (
                  <div className="space-y-3">
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
                      <SelectTrigger><SelectValue placeholder="Choisir un pays" /></SelectTrigger>
                      <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {userType === "driver" && (
                  <div className="space-y-3">
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
                      <SelectTrigger><Truck className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Type de véhicule" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moto">🏍️ Moto</SelectItem>
                        <SelectItem value="velo">🚲 Vélo</SelectItem>
                        <SelectItem value="voiture">🚗 Voiture</SelectItem>
                        <SelectItem value="tricycle">🛺 Tricycle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Credentials */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Identifiants</p>
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

                <div className="flex items-start gap-2">
                  <input type="checkbox" id="privacy-policy" required className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                  <label htmlFor="privacy-policy" className="text-xs text-muted-foreground leading-tight">
                    J'accepte les{" "}
                    <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary underline hover:text-primary/80">conditions d'utilisation</button>
                    {" "}et la{" "}
                    <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary underline hover:text-primary/80">politique de confidentialité</button>
                  </label>
                </div>

                <Button type="submit" variant="hero" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Inscription...</> : "Créer mon compte"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">ou</span></div>
              </div>
              <Button type="button" variant="outline" className="w-full gap-2 h-11" onClick={handleGoogleSignIn} disabled={isLoading}>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                S'inscrire avec Google
              </Button>
            </div>
          )}
        </div>
      </div>

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
                <p>Les présentes CGU régissent l'accès et l'utilisation de NUKUCONNECT.</p>
                <h3 className="text-foreground font-semibold">2. Accès</h3>
                <p>L'inscription est ouverte à toute personne souhaitant acheter ou vendre des produits agricoles.</p>
                <h3 className="text-foreground font-semibold">3. Services</h3>
                <p>NUKUCONNECT facilite la mise en relation, la vente, la communication et le suivi des commandes.</p>
                <h3 className="text-foreground font-semibold">4. Paiements</h3>
                <p>Les transactions sont effectuées via Paygate Global. NUKUCONNECT peut prélever une commission.</p>
                <div className="pt-4"><Button variant="outline" size="sm" className="w-full" onClick={() => setLegalSheet(null)}>Fermer</Button></div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <h3 className="text-foreground font-semibold">1. Collecte des données</h3>
                <p>Nous collectons les données nécessaires : nom, email, téléphone, localisation.</p>
                <h3 className="text-foreground font-semibold">2. Protection</h3>
                <p>Nous appliquons des mesures de sécurité pour protéger vos données.</p>
                <h3 className="text-foreground font-semibold">3. Vos droits</h3>
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
