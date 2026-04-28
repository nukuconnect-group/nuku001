import SEO from "@/components/SEO";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Crown, Rocket, Zap, Star, ArrowRight, Loader2, ShieldCheck, Phone, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePaygatePolling } from "@/hooks/usePaygatePolling";
import { getFreshAuthSession, invokeAuthenticatedFunction } from "@/lib/edgeFunctions";
import moovFloozLogo from "@/assets/moov-flooz.png";
import mixxYasLogo from "@/assets/mixx-yas.png";
import visaMcLogo from "@/assets/visa-mastercard.png";

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
      "Badge Vérifié",
      "Support standard",
    ],
    limitations: [],
  },
  {
    id: "standard", name: "Standard", price: 5000, maxProducts: 30, commission: 8, credits: 8,
    description: "Le plus populaire — recommandé", icon: Star, color: "bg-primary", popular: true,
    features: [
      "Jusqu'à 30 produits publiés",
      "8 crédits disponibles",
      "Accès à la traçabilité des produits",
      "Mise en avant des produits",
      "Accès à NukuConnect IA",
      "Statistiques avancées",
      "Recommandations IA",
      "Badge Vérifié Premium",
      "Support prioritaire",
    ],
    limitations: [],
  },
  {
    id: "premium", name: "Premium", price: 10000, maxProducts: 9999, commission: 5, credits: 20,
    description: "Toutes les fonctionnalités incluses", icon: Rocket, color: "bg-gradient-hero", popular: false,
    features: [
      "Annonces produits illimitées",
      "20 crédits disponibles",
      "Toutes les fonctionnalités du Standard",
      "Intégration API (ERP / CRM)",
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

const networks = [
  { id: "FLOOZ", label: "Moov / Flooz", logo: moovFloozLogo },
  { id: "TMONEY", label: "T-Money", logo: mixxYasLogo },
  { id: "CARD", label: "Visa / MC", logo: visaMcLogo },
];

const Plans = () => {
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentIdentifier, setPaymentIdentifier] = useState("");
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription, refreshSubscription } = useSubscription();

  const activateSubscription = useCallback(async (planId: string, paymentProof?: { identifier?: string; tx_reference?: string }) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    let session;
    try {
      session = await getFreshAuthSession();
    } catch {
      toast({
        title: "Session expirée",
        description: "Veuillez vous reconnecter pour finaliser votre abonnement.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const data = await invokeAuthenticatedFunction<{ error?: string }>("update-subscription", {
      plan: planId,
      billing_period: "annual",
      payment_identifier: paymentProof?.identifier,
      payment_tx_reference: paymentProof?.tx_reference,
    }, session);

    if (data?.error) throw new Error(data.error);

    await supabase.from("notifications").insert({
      user_id: session.user.id,
      type: "subscription",
      title: `🎉 Plan ${plan.name} activé !`,
      description: `Bienvenue sur le plan ${plan.name}. Commission ${plan.commission}%, ${plan.maxProducts >= 9999 ? "annonces illimitées" : plan.maxProducts + " annonces"}.`,
    });

    await refreshSubscription();
    toast({ title: "🎉 Abonnement activé !", description: `Plan ${plan.name} activé avec succès.` });
    setPaymentStep(null);
    setPollingEnabled(false);
    setSubscribing(null);
  }, [navigate, refreshSubscription, toast]);

  const handlePaymentCompleted = useCallback((data: any) => {
    setPollingEnabled(false);
    if (paymentStep) {
      void activateSubscription(paymentStep, {
        identifier: paymentIdentifier,
        tx_reference: data?.tx_reference,
      }).catch((error: any) => {
        setSubscribing(null);
        toast({
          title: "Erreur d'abonnement",
          description: error?.message || "Impossible d'activer votre abonnement.",
          variant: "destructive",
        });
      });
    }
  }, [paymentIdentifier, paymentStep, activateSubscription, toast]);

  const handlePaymentFailed = useCallback(() => {
    setPollingEnabled(false);
    setSubscribing(null);
    toast({ title: "❌ Paiement échoué", description: "Réessayez ou choisissez un autre moyen.", variant: "destructive" });
  }, [toast]);

  const handlePaymentExpired = useCallback(() => {
    setPollingEnabled(false);
    setSubscribing(null);
    toast({ title: "⏰ Délai expiré", description: "Le paiement n'a pas été confirmé.", variant: "destructive" });
  }, [toast]);

  const { status: pollingStatus, attempts } = usePaygatePolling({
    identifier: paymentIdentifier,
    enabled: pollingEnabled,
    intervalMs: 5000,
    maxAttempts: 60,
    onCompleted: handlePaymentCompleted,
    onFailed: handlePaymentFailed,
    onExpired: handlePaymentExpired,
  });

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

    setPaymentStep(planId);
  };

  const initiatePayment = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    const price = plan.price;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    if (selectedNetwork !== "CARD" && !phoneNumber) {
      toast({ title: "Numéro requis", description: "Entrez votre numéro Mobile Money.", variant: "destructive" });
      return;
    }

    setSubscribing(planId);
    try {
      const identifier = `NUKU-SUB-${session.user.id}-${planId}-${Date.now()}`;
      setPaymentIdentifier(identifier);

      const { data, error } = await supabase.functions.invoke("paygate-init", {
        body: {
          amount: price,
          description: `Plan ${plan.name} - NUKUCONNECT`,
          identifier,
          phone_number: phoneNumber.replace(/\s/g, ""),
          network: selectedNetwork === "CARD" ? "" : selectedNetwork,
        },
      });

      if (error) throw error;
      if (data?.mode === "redirect" && data?.payment_url) {
        window.open(data.payment_url, "_blank");
      }

      setPollingEnabled(true);
      toast({ title: "Paiement initié", description: selectedNetwork === "CARD" ? "Complétez le paiement dans la fenêtre." : "Validez sur votre téléphone." });
    } catch (err: any) {
      setSubscribing(null);
      toast({ title: "Erreur", description: err.message || "Réessayez.", variant: "destructive" });
    }
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

      <section className="py-6 sm:py-12">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {plans.map((plan) => {
              const price = plan.price;
              const isCustom = price === -1;
              const isCurrent = currentPlan === plan.id;
              const isPayingThis = paymentStep === plan.id;

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

                    {isPayingThis && (
                      <div className="rounded-xl border-2 border-primary bg-primary/5 p-2.5 space-y-2">
                        <p className="text-[10px] font-semibold text-foreground">Moyen de paiement</p>
                        <div className="grid grid-cols-3 gap-1">
                          {networks.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => !pollingEnabled && setSelectedNetwork(n.id)}
                              className={`rounded-lg bg-background border-2 p-1 text-center transition-all ${selectedNetwork === n.id ? "border-primary" : "border-border"} ${pollingEnabled ? "opacity-50" : ""}`}
                            >
                              <img src={n.logo} alt={n.label} className="h-5 mx-auto object-contain" />
                              <p className="text-[7px] font-medium text-foreground mt-0.5">{n.label}</p>
                            </button>
                          ))}
                        </div>

                        {selectedNetwork && selectedNetwork !== "CARD" && !pollingEnabled && (
                          <div className="space-y-1">
                            <Label className="text-[9px] flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />Numéro
                            </Label>
                            <Input type="tel" placeholder="+228..." value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-7 text-[10px]" disabled={pollingEnabled} />
                          </div>
                        )}

                        {pollingEnabled && (
                          <div className="rounded-lg bg-muted/50 p-1.5 flex items-center gap-1.5">
                            {pollingStatus === "pending" && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                            {pollingStatus === "completed" && <CheckCircle2 className="w-3 h-3 text-primary" />}
                            {(pollingStatus === "failed" || pollingStatus === "expired") && <XCircle className="w-3 h-3 text-destructive" />}
                            <span className="text-[9px] font-medium">
                              {pollingStatus === "pending" ? `Vérification (${attempts}/60)` : pollingStatus === "completed" ? "Confirmé !" : "Échoué"}
                            </span>
                          </div>
                        )}

                        {selectedNetwork && !pollingEnabled && (
                          <Button variant="hero" size="sm" className="w-full gap-1 text-[10px] h-7" disabled={!!subscribing} onClick={() => initiatePayment(plan.id)}>
                            {subscribing === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            Payer {price.toLocaleString("en-US")} FCFA
                          </Button>
                        )}

                        <button type="button" onClick={() => { setPaymentStep(null); setSubscribing(null); setPollingEnabled(false); }} className="text-[9px] text-muted-foreground underline w-full text-center">
                          Annuler
                        </button>
                      </div>
                    )}

                    {!isPayingThis && (
                      <Button
                        variant={plan.popular ? "hero" : "outline"}
                        className="w-full gap-1.5 text-[11px] sm:text-xs h-8 sm:h-9 mt-auto"
                        disabled={isCurrent || !!subscribing}
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        {subscribing === plan.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isCurrent ? "Plan actuel" : plan.id === "enterprise" ? "Nous contacter" : (
                          <>{plan.id === "free" ? "Commencer" : "Choisir"}<ArrowRight className="w-3 h-3" /></>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 text-center">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              💡 Tous les packs payants sont valables <strong>12 mois</strong>. Annonces, badge vérifié, traçabilité, NukuAI et boosts inclus selon le plan choisi.
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
