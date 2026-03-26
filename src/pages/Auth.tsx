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
import { User, Store, Mail, Lock, Eye, EyeOff, Loader2, Phone, MapPin, Building, Briefcase, Wand2, ArrowLeft, Truck } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import nukuLogo from "@/assets/nukuconnect-logo-header.png";

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
  "Togo", "Bénin", "Ghana", "Côte d'Ivoire", "Burkina Faso",
  "Niger", "Mali", "Sénégal", "Guinée", "Cameroun",
  "Nigeria", "RDC", "Congo", "Gabon", "Tchad",
  "Mauritanie", "Gambie", "Sierra Leone", "Liberia",
  "Cap-Vert", "Guinée-Bissau", "Guinée équatoriale",
  "São Tomé-et-Príncipe", "Centrafrique",
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
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Common signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [userType, setUserType] = useState<"producer" | "buyer" | "driver">("buyer");
  
  // Producer fields
  const [producerName, setProducerName] = useState("");
  const [producerPhone, setProducerPhone] = useState("");
  const [producerLocation, setProducerLocation] = useState("");
  const [producerCompany, setProducerCompany] = useState("");
  const [producerSector, setProducerSector] = useState("");
  
  // Buyer fields
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [buyerLastName, setBuyerLastName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerLocation, setBuyerLocation] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("");

  // Auto-detect country from timezone/locale
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
      const detected = tzCountryMap[tz] || "Togo";
      setBuyerCountry(detected);
    } catch {
      setBuyerCountry("Togo");
    }
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    let redirected = false;
    
    const redirectUser = async (userId: string) => {
      if (redirected) return;
      redirected = true;
      
      // Retry fetching profile in case trigger hasn't created it yet (Google login)
      let profileData = null;
      for (let i = 0; i < 4; i++) {
        const { data } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("user_id", userId)
          .maybeSingle();
        profileData = data;
        if (profileData) break;
        await new Promise(r => setTimeout(r, 800));
      }
      
      if (profileData?.user_type === "producer") {
        navigate("/dashboard", { replace: true });
      } else if (profileData?.user_type === "driver") {
        navigate("/driver-dashboard", { replace: true });
      } else {
        navigate("/buyer-dashboard", { replace: true });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectUser(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !redirected) redirectUser(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          toast({
            title: "Erreur de connexion",
            description: "Email ou mot de passe incorrect.",
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email non confirmé",
            description: "Veuillez vérifier votre email pour confirmer votre compte.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur NUKUCONNECT !",
      });
      
      // Redirect will be handled by onAuthStateChange
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email envoyé", description: "Vérifiez votre boîte email pour réinitialiser votre mot de passe." });
        setForgotMode(false);
        setForgotEmail("");
      }
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicLinkEmail.trim()) return;
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setMagicLinkSent(true);
      toast({
        title: "Lien envoyé !",
        description: "Vérifiez votre boîte email pour vous connecter.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: "Erreur",
          description: "La connexion avec Google a échoué.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const fullName = userType === "buyer" 
        ? `${buyerFirstName} ${buyerLastName}`
        : producerName;
      
      const phone = userType === "buyer" ? buyerPhone : producerPhone;
      const location = userType === "buyer" 
        ? `${buyerLocation}, ${buyerCountry}`
        : producerLocation;
      
      const { data: authData, error } = await supabase.auth.signUp({
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
        if (error.message.includes("already registered")) {
          toast({
            title: "Email déjà utilisé",
            description: "Un compte existe déjà avec cet email. Essayez de vous connecter.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      // Create profile immediately after signup
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: authData.user.id,
          full_name: fullName,
          user_type: userType,
          phone: phone,
          location: location,
          bio: userType === "producer" ? `${producerCompany} - ${producerSector}` : userType === "driver" ? `Livreur - ${producerSector || 'moto'}` : null,
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        toast({
          title: "Inscription réussie !",
          description: "Bienvenue sur NUKUCONNECT !",
        });

        // Create driver profile if driver type
        if (userType === "driver") {
          const { data: newProfile } = await supabase.from("profiles")
            .select("id").eq("user_id", authData.user.id).maybeSingle();
          if (newProfile) {
            await supabase.from("driver_profiles" as any).insert({
              user_id: authData.user.id,
              profile_id: newProfile.id,
              vehicle_type: producerSector || "moto",
              zone: producerLocation,
              is_available: true,
            });
          }
        }

        // Redirect based on user type
        if (userType === "producer") {
          navigate("/dashboard");
        } else if (userType === "driver") {
          navigate("/driver-dashboard");
        } else {
          navigate("/buyer-dashboard");
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <Header />
      
      <main className="py-6 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-md mx-auto">
            {/* Logo */}
            <div className="text-center mb-5 sm:mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-primary flex items-center justify-center shadow-lg mb-3">
                <img 
                  src={nukuLogo} 
                  alt="NUKUCONNECT" 
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white p-1"
                />
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-primary">NUKUCONNECT</h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">La marketplace agricole intelligente</p>
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
                    <CardDescription>
                      Connectez-vous à votre compte NUKUCONNECT
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); }}
                          className="text-xs text-primary hover:underline"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>

                      <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connexion...
                          </>
                        ) : (
                          "Se connecter"
                        )}
                      </Button>
                    </form>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
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
                    <CardDescription>
                      Rejoignez la communauté NUKUCONNECT
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                      {/* User Type Selection */}
                      <div className="space-y-2">
                        <Label>Je suis</Label>
                       <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setUserType("producer")}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              userType === "producer"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <User className={`w-5 h-5 mx-auto mb-1.5 ${userType === "producer" ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-xs font-medium ${userType === "producer" ? "text-primary" : "text-foreground"}`}>
                              Fournisseur
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserType("buyer")}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              userType === "buyer"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Store className={`w-5 h-5 mx-auto mb-1.5 ${userType === "buyer" ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-xs font-medium ${userType === "buyer" ? "text-primary" : "text-foreground"}`}>
                              Acheteur
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserType("driver")}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              userType === "driver"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Truck className={`w-5 h-5 mx-auto mb-1.5 ${userType === "driver" ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-xs font-medium ${userType === "driver" ? "text-primary" : "text-foreground"}`}>
                              Livreur
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Producer Fields */}
                      {userType === "producer" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="producer-name">Nom complet</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="producer-name"
                                type="text"
                                placeholder="Votre nom complet"
                                value={producerName}
                                onChange={(e) => setProducerName(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="producer-phone">Téléphone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="producer-phone"
                                type="tel"
                                placeholder="+228 XX XX XX XX"
                                value={producerPhone}
                                onChange={(e) => setProducerPhone(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="producer-location">Localisation</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="producer-location"
                                type="text"
                                placeholder="Ville, Région"
                                value={producerLocation}
                                onChange={(e) => setProducerLocation(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="producer-company">Entreprise / Exploitation</Label>
                            <div className="relative">
                              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="producer-company"
                                type="text"
                                placeholder="Nom de votre entreprise"
                                value={producerCompany}
                                onChange={(e) => setProducerCompany(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="producer-sector">Secteur d'activité</Label>
                            <Select value={producerSector} onValueChange={setProducerSector}>
                              <SelectTrigger className="w-full">
                                <Briefcase className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Choisir un secteur" />
                              </SelectTrigger>
                              <SelectContent>
                                {sectors.map((sector) => (
                                  <SelectItem key={sector} value={sector}>
                                    {sector}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* Buyer Fields */}
                      {userType === "buyer" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="buyer-firstname">Prénom</Label>
                              <Input
                                id="buyer-firstname"
                                type="text"
                                placeholder="Prénom"
                                value={buyerFirstName}
                                onChange={(e) => setBuyerFirstName(e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="buyer-lastname">Nom</Label>
                              <Input
                                id="buyer-lastname"
                                type="text"
                                placeholder="Nom"
                                value={buyerLastName}
                                onChange={(e) => setBuyerLastName(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="buyer-phone">Téléphone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="buyer-phone"
                                type="tel"
                                placeholder="+228 XX XX XX XX"
                                value={buyerPhone}
                                onChange={(e) => setBuyerPhone(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="buyer-location">Ville / Localité</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="buyer-location"
                                type="text"
                                placeholder="Votre ville"
                                value={buyerLocation}
                                onChange={(e) => setBuyerLocation(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="buyer-country">Pays</Label>
                            <Select value={buyerCountry} onValueChange={setBuyerCountry}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choisir un pays" />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* Driver Fields */}
                      {userType === "driver" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="driver-name">Nom complet</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input id="driver-name" type="text" placeholder="Votre nom complet"
                                value={producerName} onChange={(e) => setProducerName(e.target.value)} className="pl-10" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="driver-phone">Téléphone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input id="driver-phone" type="tel" placeholder="+228 XX XX XX XX"
                                value={producerPhone} onChange={(e) => setProducerPhone(e.target.value)} className="pl-10" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="driver-location">Zone d'activité</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input id="driver-location" type="text" placeholder="Lomé, Kara..."
                                value={producerLocation} onChange={(e) => setProducerLocation(e.target.value)} className="pl-10" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Type de véhicule</Label>
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
                        </>
                      )}

                      {/* Common fields */}
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="votre@email.com"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            className="pl-10 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirm-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      {/* Privacy Policy Checkbox */}
                      <div className="flex items-start gap-2">
                        <input type="checkbox" id="privacy-policy" required
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                        <label htmlFor="privacy-policy" className="text-xs text-muted-foreground leading-tight">
                          J'accepte les{" "}
                          <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary underline hover:text-primary/80">
                            conditions d'utilisation
                          </button>{" "}
                          et la{" "}
                          <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary underline hover:text-primary/80">
                            politique de confidentialité
                          </button>
                        </label>
                      </div>

                      <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Inscription...
                          </>
                        ) : (
                          "Créer mon compte"
                        )}
                      </Button>
                    </form>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
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
          <SheetHeader>
            <SheetTitle>Mot de passe oublié</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="votre@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Envoyer le lien
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Legal preview sheet */}
      <Sheet open={legalSheet !== null} onOpenChange={() => setLegalSheet(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {legalSheet === "terms" ? "Conditions d'utilisation" : "Politique de confidentialité"}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(70vh-80px)] mt-4 pr-4">
            {legalSheet === "terms" ? (
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <h3 className="text-foreground font-semibold">1. Objet</h3>
                <p>Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de la plateforme NUKUCONNECT, opérée par Nukuconnect SA. En utilisant la plateforme, vous acceptez ces conditions dans leur intégralité.</p>
                
                <h3 className="text-foreground font-semibold">2. Accès à la plateforme</h3>
                <p>L'inscription est ouverte à toute personne physique ou morale souhaitant acheter ou vendre des produits agricoles. Chaque utilisateur est responsable de la véracité des informations fournies lors de l'inscription.</p>
                
                <h3 className="text-foreground font-semibold">3. Services proposés</h3>
                <p>NUKUCONNECT met en relation acheteurs et fournisseurs de produits agricoles. La plateforme facilite la mise en vente, la recherche, la communication et le suivi des commandes.</p>
                
                <h3 className="text-foreground font-semibold">4. Paiements</h3>
                <p>Les transactions sont effectuées via les moyens de paiement proposés sur la plateforme. NUKUCONNECT peut prélever une commission sur les ventes réalisées.</p>
                
                <h3 className="text-foreground font-semibold">5. Responsabilités</h3>
                <p>NUKUCONNECT agit en tant qu'intermédiaire et ne peut être tenu responsable de la qualité des produits vendus par les fournisseurs. Les litiges entre acheteurs et vendeurs doivent être résolus directement entre les parties.</p>
                
                <h3 className="text-foreground font-semibold">6. Propriété intellectuelle</h3>
                <p>Tous les contenus de la plateforme (logos, textes, images) sont la propriété de Nukuconnect SA et sont protégés par le droit de la propriété intellectuelle.</p>

                <div className="pt-4">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setLegalSheet(null)}>Fermer</Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <h3 className="text-foreground font-semibold">1. Collecte des données</h3>
                <p>Nous collectons les données personnelles nécessaires au fonctionnement de la plateforme : nom, email, téléphone, localisation et informations de profil.</p>
                
                <h3 className="text-foreground font-semibold">2. Utilisation des données</h3>
                <p>Vos données sont utilisées pour gérer votre compte, faciliter les transactions, améliorer nos services et vous envoyer des communications liées à votre activité sur la plateforme.</p>
                
                <h3 className="text-foreground font-semibold">3. Protection des données</h3>
                <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre tout accès non autorisé, modification ou divulgation.</p>
                
                <h3 className="text-foreground font-semibold">4. Partage des données</h3>
                <p>Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec des partenaires uniquement dans le cadre de l'exécution des services (livraison, paiement).</p>
                
                <h3 className="text-foreground font-semibold">5. Vos droits</h3>
                <p>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Contactez-nous à support@nukuconnect.com pour exercer ces droits.</p>
                
                <h3 className="text-foreground font-semibold">6. Cookies</h3>
                <p>La plateforme utilise des cookies pour améliorer votre expérience. Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.</p>

                <div className="pt-4">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setLegalSheet(null)}>Fermer</Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Auth;
