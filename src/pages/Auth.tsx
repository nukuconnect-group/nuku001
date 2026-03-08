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
import { User, Store, Mail, Lock, Eye, EyeOff, Loader2, Phone, MapPin, Building, Briefcase, Wand2, ArrowLeft } from "lucide-react";
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
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Common signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [userType, setUserType] = useState<"producer" | "buyer">("buyer");
  
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
      
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (profileData?.user_type === "producer") {
        navigate("/dashboard", { replace: true });
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
      
      const fullName = userType === "producer" 
        ? producerName 
        : `${buyerFirstName} ${buyerLastName}`;
      
      const phone = userType === "producer" ? producerPhone : buyerPhone;
      const location = userType === "producer" 
        ? producerLocation 
        : `${buyerLocation}, ${buyerCountry}`;
      
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
          bio: userType === "producer" ? `${producerCompany} - ${producerSector}` : null,
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        toast({
          title: "Inscription réussie !",
          description: "Bienvenue sur NUKUCONNECT !",
        });

        // Redirect based on user type
        if (userType === "producer") {
          navigate("/dashboard");
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
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setUserType("producer")}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              userType === "producer"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <User className={`w-6 h-6 mx-auto mb-2 ${userType === "producer" ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-medium ${userType === "producer" ? "text-primary" : "text-foreground"}`}>
                              Fournisseur
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserType("buyer")}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              userType === "buyer"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Store className={`w-6 h-6 mx-auto mb-2 ${userType === "buyer" ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-medium ${userType === "buyer" ? "text-primary" : "text-foreground"}`}>
                              Acheteur
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
                          <Link to="/terms" target="_blank" className="text-primary underline hover:text-primary/80">
                            conditions d'utilisation
                          </Link>{" "}
                          et la{" "}
                          <Link to="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">
                            politique de confidentialité
                          </Link>
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
    </div>
  );
};

export default Auth;
