import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import nukuLogo from "@/assets/nukuconnect-logo-header.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        setSuccess(true);
        toast({ title: "Mot de passe mis à jour", description: "Vous pouvez maintenant vous connecter." });
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
      }
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <SEO title="Réinitialiser le mot de passe" description="Réinitialisez votre mot de passe NukuConnect." noIndex />
      <Header />
      <main className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary flex items-center justify-center shadow-lg mb-3">
                <img src={nukuLogo} alt="NUKUCONNECT" className="w-16 h-16 object-contain rounded-full bg-white p-1" />
              </div>
              <h2 className="font-heading text-lg font-bold text-primary">Réinitialisation du mot de passe</h2>
            </div>

            <Card variant="feature">
              {success ? (
                <CardContent className="py-10 text-center space-y-4">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                  <p className="text-lg font-semibold text-foreground">Mot de passe mis à jour !</p>
                  <p className="text-sm text-muted-foreground">Redirection vers la connexion...</p>
                </CardContent>
              ) : !isRecovery ? (
                <CardContent className="py-10 text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ce lien est invalide ou a expiré. Veuillez demander un nouveau lien de réinitialisation.
                  </p>
                  <Button variant="hero" onClick={() => navigate("/auth")}>Retour à la connexion</Button>
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>Nouveau mot de passe</CardTitle>
                    <CardDescription>Choisissez un nouveau mot de passe pour votre compte</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nouveau mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                      <div className="space-y-2">
                        <Label>Confirmer le mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Mettre à jour le mot de passe
                      </Button>
                    </form>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
