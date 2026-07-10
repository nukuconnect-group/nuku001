import SEO from "@/components/SEO";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Crown, Rocket, Zap, Star, ArrowRight, Loader2, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFreshAuthSession, invokeAuthenticatedFunction } from "@/lib/edgeFunctions";
import { openMonerooPay } from "@/lib/moneroo";

const PENDING_PLAN_KEY = "nuku:pendingPlan";

// Plans alignés sur la nouvelle politique tarifaire NukuConnect
const plans = [
  {
    id: "free", name: "Gratuit", price: 0, maxProducts: 5, commission: 8, credits: 0,
    description: "1 mois offert + 2 renouvellements possibles", icon: Zap, color: "bg-muted", popular: false,
    features: [
      "Maximum 5 produits publiés",
      "Accès à NukuConnect IA",
      "Messagerie intégrée",
      "Statistiques de base",
      "Vérification KYC (badge vérifié)",
      "Durée : 1 mois (2 renouvellements gratuits possibles)",
    ],
    limitations: ["Pas de mise en avant produits", "Pas de traçabilité QR", "Pas de crédits boost"],
  },
  {
    id: "starter", name: "Starter", price: 2500, maxProducts: 15, commission: 8, credits: 4,
    description: "Pour démarrer activement", icon: Sparkles, color: "bg-secondary", popular: false,
    features: [
      "Jusqu'à 15 produits publiés",
      "4 crédits disponibles",
      "Accès à la traçabilité des produits",
      "Mise en avant des produits",
      "Accès à NukuConnect IA",
      "Statistiques avancées",
      "Recommandations IA",
    ],
    limitations: [],
  },
  {
    id: "standard", name: "Standard", price: 5000, maxProducts: 30, commission: 8, credits: 8,
    description: "Le choix populaire", icon: Star, color: "bg-primary", popular: true,
    features: [
      "Jusqu'à 30 produits publiés",
      "8 crédits disponibles",
      "Traçabilité QR avancée",
      "Mise en avant prioritaire",
      "Dashboard analytics",
      "Support prioritaire",
      "Badge vérifié Pro",
    ],
    limitations: [],
  },
  {
    id: "premium", name: "Premium", price: 10000, maxProducts: 9999, commission: 5, credits: 20,
    description: "Pour les professionnels", icon: Rocket, color: "bg-primary", popular: false,
    features: [
      "Annonces illimitées",
      "20 crédits disponibles",
      "Accès API NukuConnect",
      "Conseiller dédié NukuAI",
      "Dashboard analytics avancées (BI)",
      "Mises en avant homepage prioritaires",
      "Account Manager dédié",
      "Support 24/7",
      "Commission réduite à 5%",
    ],
    limitations: [],
  },
  {
    id: "enterprise", name: "Entreprise", price: -1, maxProducts: 9999, commission: 2,
    description: "Solutions sur mesure", icon: Crown, color: "bg-accent", popular: false,
    features: [
      "Tout le plan Premium",
      "Infrastructure dédiée",
      "SLA garanti 99.9%",
      "Intégrations sur mesure",
      "White-label possible",
      "Formation équipe complète",
      "Audit sécurité",
      "Commission négociable (à partir de 2%)",
    ],
    limitations: [],
  },
];

const Plans = () => {
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription, refreshSubscription } = useSubscription();

  const activateSubscription = useCallback(async (planId: string, paymentProof?: { transactionId?: string }) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    let session;
    try {
      session = await getFreshAuthSession();
      setSessionExpired(false);
    } catch {
      try {
        sessionStorage.setItem(PENDING_PLAN_KEY, JSON.stringify({ planId, paymentProof, ts: Date.now() }));
      } catch { /* noop */ }
      setSessionExpired(true);
      setSubscribing(null);
      toast({
        title: "Session expirée",
        description: "Veuillez vous reconnecter pour finaliser votre abonnement.",
        variant: "destructive",
      });
      return;
    }

    const data = await invokeAuthenticatedFunction<{ error?: string }>("update-subscription", {
      plan: planId,
      billing_period: "annual",
      payment_identifier: paymentProof?.transactionId,
    }, session);

    if (data?.error) throw new Error(data.error);

    try { sessionStorage.removeItem(PENDING_PLAN_KEY); } catch { /* noop */ }

    await supabase.from("notifications").insert({
      user_id: session.user.id,
      type: "subscription",
      title: `🎉 Plan ${plan.name} activé !`,
      description: `Bienvenue sur le plan ${plan.name}. Commission ${plan.commission}%, ${plan.maxProducts >= 9999 ? "annonces illimitées" : plan.maxProducts + " annonces"}.`,
    });

    await refreshSubscription();
    toast({ title: "🎉 Abonnement activé !", description: `Plan ${plan.name} activé avec succès.` });
    setSubscribing(null);
  }, [refreshSubscription, toast]);

  // Auto-resume after returning from /auth
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let pending: { planId: string; paymentProof?: { transactionId?: string }; ts: number } | null = null;
      try {
        const raw = sessionStorage.getItem(PENDING_PLAN_KEY);
        if (raw) pending = JSON.parse(raw);
      } catch { /* noop */ }
      if (!pending) return;
      if (Date.now() - pending.ts > 30 * 60 * 1000) {
        sessionStorage.removeItem(PENDING_PLAN_KEY);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      setSessionExpired(false);
      try {
        await activateSubscription(pending.planId, pending.paymentProof);
      } catch (err: any) {
        toast({ title: "Reprise impossible", description: err?.message || "Réessayez.", variant: "destructive" });
      }
    })();
    return () => { cancelled = true; };
  }, [activateSubscription, toast]);

  const handleReconnect = useCallback(() => {
    navigate("/auth?redirect=/plans");
  }, [navigate]);

  const handleSubscribe = async (planId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour souscrire.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (planId === "enterprise") {
      toast({ title: "Contactez-nous", description: "Envoyez un email à contact@nukuconnect.com pour le plan Entreprise." });
      return;
    }

    if (planId === "free") {
      setSubscribing(planId);
      try {
        await activateSubscription(planId);
      } catch (error: any) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } finally {
        setSubscribing(null);
      }
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setSubscribing(planId);

    openMonerooPay({
      amount: plan.price,
      description: `Plan ${plan.name} - NUKUCONNECT (12 mois)`,
      customer: { email: session.user.email || "" },
      context: "plan",
      contextData: { planId, planName: plan.name },
      onError: (msg) => {
        setSubscribing(null);
        toast({ title: "❌ Erreur de paiement", description: msg, variant: "destructive" });
      },
    });
  };

  const currentPlan = subscription?.plan;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/plans" title="Plans Premium NUKUCONNECT" description="Choisissez votre plan : Gratuit, Starter, Standard, Premium ou Entreprise. Boostez vos ventes agricoles avec NukuConnect." image="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=630&fit=crop&q=80" />
      <Header />

      <section className="pt-4 sm:pt-12 pb-8 sm:pb-12 bg-gradient-earth">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <Badge variant="secondary" className="mb-3 sm:mb-4 text-[11px] sm:text-sm">
            <Crown className="w-3 h-3 mr-1" />
            Plans Premium
          </Badge>
          <h1 className="font-heading text-xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            Devenez Premium pour vendre plus
          </h1>
          <p className="text-xs sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto mb-4 sm:mb-6">
            Débloquez le badge vérifié, NukuAI, la traçabilité et boostez vos produits.
          </p>

          {currentPlan && (
            <div className="mb-4">
              <Badge className="bg-primary text-primary-foreground text-sm px-4 py-1">
                Plan actuel : {plans.find(p => p.id === currentPlan)?.name || currentPlan}
              </Badge>
            </div>
          )}

          <p className="text-[10px] sm:text-xs text-muted-foreground italic">
            Tous les packs payants sont valables 12 mois.
          </p>
        </div>
      </section>

      {sessionExpired && (
        <section className="py-3">
          <div className="container mx-auto px-3 sm:px-4 max-w-3xl">
            <Alert variant="destructive" role="alert" aria-live="polite">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Session expirée</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm">
                  Votre session a expiré. Reconnectez-vous : votre paiement reprendra automatiquement.
                </span>
                <Button size="sm" variant="outline" onClick={handleReconnect} className="self-start sm:self-auto">
                  Se reconnecter
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </section>
      )}

      <section className="py-6 sm:py-12">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {plans.map((plan) => {
              const price = plan.price;
              const isCustom = price === -1;
              const isCurrent = currentPlan === plan.id;

              return (
                <Card key={plan.id} className={`relative overflow-hidden flex flex-col ${plan.popular ? "border-primary shadow-elevated lg:scale-105 z-10" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                  {plan.popular && (
                    <div className="absolute top-2 right-2 z-10"><Badge className="bg-primary text-[9px]">⭐ Recommandé</Badge></div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-2 left-2 z-10"><Badge className="bg-accent text-accent-foreground text-[9px]">Actuel</Badge></div>
                  )}

                  <CardHeader className="pb-2 p-3 sm:p-4">
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${plan.color} flex items-center justify-center mb-2`}>
                      <plan.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-sm sm:text-base">{plan.name}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs line-clamp-2">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 p-3 sm:p-4 pt-0 flex-1 flex flex-col">
                    <div>
                      {isCustom ? (
                        <span className="font-heading text-base font-bold text-foreground">Sur devis</span>
                      ) : price === 0 ? (
                        <span className="font-heading text-xl sm:text-2xl font-bold text-foreground">Gratuit</span>
                      ) : (
                        <>
                          <span className="font-heading text-xl sm:text-2xl font-bold text-foreground">{price.toLocaleString("en-US")}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground"> FCFA</span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground block">/an</span>
                        </>
                      )}
                    </div>

                    <Badge variant="outline" className="text-[9px] sm:text-[10px] border-primary/30 text-primary w-fit">
                      Commission ventes : {plan.commission}%
                    </Badge>

                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">{f}</span>
                        </li>
                      ))}
                      {plan.limitations.map((l) => (
                        <li key={l} className="flex items-start gap-1.5 opacity-50">
                          <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center text-muted-foreground text-[10px] flex-shrink-0">×</span>
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">{l}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={plan.popular ? "hero" : "outline"}
                      className="w-full gap-1.5 text-[11px] sm:text-xs h-8 sm:h-9 mt-auto"
                      disabled={isCurrent || !!subscribing}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {subscribing === plan.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isCurrent ? "Plan actuel" : plan.id === "enterprise" ? "Nous contacter" : (
                        <>{plan.id === "free" ? "Commencer" : <><ShieldCheck className="w-3 h-3" /> Choisir</>}<ArrowRight className="w-3 h-3" /></>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 text-center">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              💡 Tous les packs payants sont valables <strong>12 mois</strong>. Annonces, badge vérifié, traçabilité, NukuAI et boosts inclus selon le plan choisi.
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              🔒 Paiement sécurisé via Moneroo — Mobile Money, Visa, Mastercard
            </p>
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-12 bg-muted/30">
        <div className="container mx-auto px-3 sm:px-4">
          <h2 className="font-heading text-base sm:text-2xl font-bold text-center mb-4 sm:mb-8">Questions fréquentes</h2>
          <div className="max-w-3xl mx-auto space-y-2 sm:space-y-4">
            {[
              { q: "Puis-je changer de plan à tout moment ?", a: "Oui, vous pouvez upgrader à tout moment. Les nouveaux avantages s'appliquent immédiatement." },
              { q: "Combien de temps les avantages durent-ils ?", a: "Tous les packs payants (Starter, Standard, Premium) sont valables 12 mois à compter de l'activation." },
              { q: "Comment fonctionne le badge vérifié ?", a: "Tous les fournisseurs (gratuit ou payant) peuvent passer le KYC. Le badge vérifié apparaît dès validation par notre équipe." },
              { q: "Quelle est la commission sur les ventes ?", a: "8% pour les plans Gratuit, Starter et Standard. 5% pour Premium. Négociable pour Entreprise." },
              { q: "Que se passe-t-il à la fin des 12 mois ?", a: "Vos boosts inutilisés expirent. Vous repassez automatiquement au plan Gratuit sauf renouvellement." },
            ].map((f, i) => (
              <Card key={i}><CardContent className="p-3 sm:p-4">
                <h3 className="font-semibold text-foreground mb-1 text-xs sm:text-sm">{f.q}</h3>
                <p className="text-muted-foreground text-[11px] sm:text-sm">{f.a}</p>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Plans;
