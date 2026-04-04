import SEO from "@/components/SEO";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { activateMembership, type MembershipPlanId } from "@/lib/subscriptionFlow";
import { CheckCircle2, Crown, Loader2, ShieldCheck, Store, Truck } from "lucide-react";

const sellerPlans = [
  {
    id: "free" as MembershipPlanId,
    name: "Pack Gratuit",
    price: "0 FCFA",
    maxProducts: 3,
    badge: "Départ",
    features: ["3 produits", "Messagerie vendeur", "Premières ventes"],
  },
  {
    id: "pro" as MembershipPlanId,
    name: "Pack Pro",
    price: "5 000 FCFA / mois",
    maxProducts: 15,
    badge: "Populaire",
    features: ["15 produits", "Badge vérifié", "Statistiques"],
  },
  {
    id: "business" as MembershipPlanId,
    name: "Pack Business",
    price: "15 000 FCFA / mois",
    maxProducts: 9999,
    badge: "Avancé",
    features: ["Produits illimités", "Boost illimité", "Outils avancés"],
  },
];

const BecomeSeller = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading, updateProfile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanId>("free");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth?returnTo=/devenir-fournisseur", { replace: true });
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setLocation(profile.location || "");
    setBio(profile.bio || "");
  }, [profile]);

  const selectedPlanConfig = useMemo(
    () => sellerPlans.find((plan) => plan.id === selectedPlan) || sellerPlans[0],
    [selectedPlan]
  );

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!fullName.trim() || !location.trim() || !phone.trim()) {
      toast({
        title: "Champs requis",
        description: "Renseignez votre nom, votre téléphone et votre localisation.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await activateMembership({
        userId: user.id,
        profileId: profile.id,
        planId: selectedPlan,
        billing,
        maxProducts: selectedPlanConfig.maxProducts,
        promoteToProducer: true,
        fullName,
        location,
        bio,
        phone,
      });

      updateProfile({
        full_name: fullName,
        location,
        bio,
        user_type: "producer",
      });

      toast({
        title: "Compte fournisseur activé",
        description: `Votre pack ${result.planLabel} est maintenant rattaché à votre compte.`,
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <SEO url="/devenir-fournisseur" title="Devenir Fournisseur" description="Rejoignez NUKUCONNECT et vendez vos produits agricoles à des milliers d'acheteurs. Inscription gratuite et rapide." />
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
        <div className="mb-6">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <Store className="w-3.5 h-3.5" /> Parcours fournisseur
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Devenir fournisseur et choisir votre pack
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Complétez vos informations, choisissez votre pack d'adhésion puis activez votre compte vendeur.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-4 h-4 text-primary" /> Informations du compte fournisseur
              </CardTitle>
              <CardDescription>
                Ces informations seront affichées sur votre espace fournisseur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Nom complet</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom complet" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Téléphone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Localisation</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lomé, Togo" />
              </div>
              <div>
                <Label className="mb-1.5 block">Présentation</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  placeholder="Présentez votre activité, vos produits et votre zone de vente."
                />
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground mb-2">Ce qui sera activé après validation</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Passage immédiat en compte fournisseur</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Pack rattaché à votre compte</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Message de félicitations dans votre messagerie et vos notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="w-4 h-4 text-primary" /> Choisissez votre pack
              </CardTitle>
              <CardDescription>
                La publication des produits est activée uniquement après sélection d'un pack.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="inline-flex rounded-full bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                    billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                    billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Annuel
                </button>
              </div>

              <div className="space-y-3">
                {sellerPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      selectedPlan === plan.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{plan.name}</p>
                        <p className="text-sm text-primary font-medium">{plan.id === "free" ? plan.price : billing === "annual" ? `${plan.price.replace("/ mois", "")} / an` : plan.price}</p>
                      </div>
                      <Badge variant={selectedPlan === plan.id ? "default" : "secondary"}>{plan.badge}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {plan.features.map((feature) => (
                        <p key={feature} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {feature}
                        </p>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-xl bg-card border border-border p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Résumé de l'activation</p>
                <p className="text-xs text-muted-foreground">Pack sélectionné : <span className="font-medium text-foreground">{selectedPlanConfig.name}</span></p>
                <p className="text-xs text-muted-foreground">Quota : <span className="font-medium text-foreground">{selectedPlanConfig.maxProducts >= 9999 ? "Illimité" : `${selectedPlanConfig.maxProducts} produits`}</span></p>
                <p className="text-xs text-muted-foreground flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-primary" /> Vous pourrez publier vos offres après activation.</p>
              </div>

              <Button onClick={handleSubmit} disabled={isSubmitting || isLoading} className="w-full gap-2" variant="hero">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                Activer mon compte fournisseur
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default BecomeSeller;