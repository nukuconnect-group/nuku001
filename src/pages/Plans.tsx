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
import { Check, Crown, Rocket, Zap, Star, ArrowRight, Loader2, ShieldCheck, Phone, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePaygatePolling } from "@/hooks/usePaygatePolling";
import moovFloozLogo from "@/assets/moov-flooz.png";
import mixxYasLogo from "@/assets/mixx-yas.png";
import visaMcLogo from "@/assets/visa-mastercard.png";

const plans = [
  {
    id: "free", name: "Gratuit", monthlyPrice: 0, annualPrice: 0, maxProducts: 3, commission: 8,
    description: "Pour découvrir NUKUCONNECT", icon: Zap, color: "bg-muted", popular: false,
    features: ["Création de compte", "3 annonces produits max", "Messagerie de base", "Accès au marketplace", "Support communautaire", "Commission de 8% sur les ventes"],
    limitations: ["Limité à 3 produits", "Pas de mise en avant", "Pas de statistiques avancées", "Pas de badge vérifié"],
  },
  {
    id: "pro", name: "Pro", monthlyPrice: 5000, annualPrice: 50000, maxProducts: 15, commission: 5,
    description: "Pour les fournisseurs actifs", icon: Star, color: "bg-primary", popular: true,
    features: ["Tout le plan Gratuit", "15 annonces produits", "Badge vérifié", "Mise en avant (3/mois)", "Statistiques de ventes", "Support prioritaire", "Formations premium", "QR codes traçabilité", "Commission réduite à 5%"],
    limitations: [],
  },
  {
    id: "business", name: "Business", monthlyPrice: 15000, annualPrice: 150000, maxProducts: 9999, commission: 3,
    description: "Pour les entreprises agricoles", icon: Rocket, color: "bg-gradient-hero", popular: false,
    features: ["Tout le plan Pro", "Annonces illimitées", "Mise en avant illimitée", "Dashboard analytics avancé", "API d'intégration", "Account manager dédié", "Formation sur mesure", "Certification qualité", "Commission réduite à 3%"],
    limitations: [],
  },
  {
    id: "enterprise", name: "Entreprise", monthlyPrice: -1, annualPrice: -1, maxProducts: 9999, commission: 2,
    description: "Solutions personnalisées", icon: Crown, color: "bg-accent", popular: false,
    features: ["Tout le plan Business", "Infrastructure dédiée", "SLA garanti 99.9%", "Intégration ERP/CRM", "White-label possible", "Support 24/7", "Formation équipe", "Audit sécurité", "Commission négociable (à partir de 2%)"],
    limitations: [],
  },
];

const networks = [
  { id: "FLOOZ", label: "Moov / Flooz", logo: moovFloozLogo },
  { id: "TMONEY", label: "T-Money", logo: mixxYasLogo },
  { id: "CARD", label: "Visa / MC", logo: visaMcLogo },
];

const Plans = () => {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<string | null>(null); // planId being paid
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentIdentifier, setPaymentIdentifier] = useState("");
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription, refreshSubscription } = useSubscription();

  const activateSubscription = useCallback(async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("subscriptions" as any).upsert({
      user_id: session.user.id,
      plan: planId,
      billing_period: billing,
      max_products: plan.maxProducts,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: billing === "monthly"
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : new Date(Date.now() + 365 * 86400000).toISOString(),
    } as any, { onConflict: "user_id" });

    if (error) throw error;

    // Send welcome notification
    await supabase.from("notifications").insert({
      user_id: session.user.id,
      type: "subscription",
      title: `🎉 Félicitations ! Plan ${plan.name} activé`,
      description: `Bienvenue sur le plan ${plan.name} ! Vous bénéficiez de ${plan.maxProducts === 9999 ? "produits illimités" : plan.maxProducts + " produits"}, commission de ${plan.commission}%. ${planId === "pro" ? "Passez au Business pour encore plus d'avantages !" : planId === "free" ? "Passez au Pro pour débloquer plus de fonctionnalités !" : "Vous profitez du meilleur plan !"}`,
    });

    await refreshSubscription();
    toast({ title: "🎉 Abonnement activé !", description: `Plan ${plan.name} activé avec succès.` });
    setPaymentStep(null);
    setPollingEnabled(false);
    setSubscribing(null);
  }, [billing, refreshSubscription, toast]);

  const handlePaymentCompleted = useCallback((data: any) => {
    setPollingEnabled(false);
    if (paymentStep) {
      activateSubscription(paymentStep);
    }
  }, [paymentStep, activateSubscription]);

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

    // Free plan - activate directly
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

    // Paid plan - show payment step
    setPaymentStep(planId);
  };

  const initiatePayment = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;

    if (selectedNetwork !== "CARD" && !phoneNumber) {
      toast({ title: "Numéro requis", description: "Entrez votre numéro Mobile Money.", variant: "destructive" });
      return;
    }

    setSubscribing(planId);
    try {
      const identifier = `NUKU-SUB-${planId}-${Date.now()}`;
      setPaymentIdentifier(identifier);

      const { data, error } = await supabase.functions.invoke("paygate-init", {
        body: {
          amount: price,
          description: `Abonnement ${plan.name} ${billing === "monthly" ? "Mensuel" : "Annuel"} - NUKUCONNECT`,
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
      <Header />

      {/* Hero */}
      <section className="pt-4 sm:pt-12 pb-8 sm:pb-16 bg-gradient-earth">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <Badge variant="secondary" className="mb-3 sm:mb-4 text-[11px] sm:text-sm">
            <Crown className="w-3 h-3 mr-1" />
            Plans d'adhésion
          </Badge>
          <h1 className="font-heading text-xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-2 sm:mb-4">
            Choisissez votre plan d'adhésion
          </h1>
          <p className="text-xs sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
            Des solutions adaptées à chaque étape de votre croissance.
          </p>

          {currentPlan && (
            <div className="mb-6">
              <Badge className="bg-primary text-primary-foreground text-sm px-4 py-1">
                Plan actuel : {currentPlan === "free" ? "Gratuit" : currentPlan === "pro" ? "Pro" : currentPlan === "business" ? "Business" : currentPlan}
              </Badge>
            </div>
          )}

          <div className="inline-flex items-center bg-muted rounded-full p-1 gap-0.5">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${billing === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all relative ${billing === "annual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Annuel
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">-17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 sm:py-16">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {plans.map((plan) => {
              const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
              const isCustom = price === -1;
              const period = billing === "monthly" ? "/mois" : "/an";
              const isCurrent = currentPlan === plan.id;
              const isPayingThis = paymentStep === plan.id;

              return (
                <Card key={plan.id} className={`relative overflow-hidden ${plan.popular ? "border-primary shadow-elevated" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                  {plan.popular && (
                    <div className="absolute top-3 right-3"><Badge variant="default" className="bg-primary text-[10px]">Populaire</Badge></div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-3 left-3"><Badge className="bg-accent text-accent-foreground text-[10px]">Actuel</Badge></div>
                  )}

                  <CardHeader className="pb-3 p-4 sm:p-6">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${plan.color} flex items-center justify-center mb-3`}>
                      <plan.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-base sm:text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-[11px] sm:text-sm">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                    <div>
                      {isCustom ? (
                        <span className="font-heading text-lg sm:text-xl font-bold text-foreground">Sur devis</span>
                      ) : price === 0 ? (
                        <span className="font-heading text-2xl sm:text-4xl font-bold text-foreground">Gratuit</span>
                      ) : (
                        <>
                          <span className="font-heading text-2xl sm:text-4xl font-bold text-foreground">{price.toLocaleString()}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground"> FCFA</span>
                          <span className="text-[10px] sm:text-sm text-muted-foreground">{period}</span>
                        </>
                      )}
                    </div>

                    <Badge variant="outline" className="text-[10px] sm:text-xs border-primary/30 text-primary">
                      Commission : {plan.commission}%
                    </Badge>

                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-[11px] sm:text-sm text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.limitations.length > 0 && (
                      <ul className="space-y-1.5 pt-3 border-t border-border">
                        {plan.limitations.map((l) => (
                          <li key={l} className="flex items-start gap-2 opacity-50">
                            <span className="w-4 h-4 flex items-center justify-center text-muted-foreground text-xs">×</span>
                            <span className="text-[11px] sm:text-sm text-muted-foreground">{l}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Payment step for this plan */}
                    {isPayingThis && (
                      <div className="rounded-xl border-2 border-primary bg-primary/5 p-3 space-y-3">
                        <p className="text-xs font-semibold text-foreground">Choisir le moyen de paiement</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {networks.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => !pollingEnabled && setSelectedNetwork(n.id)}
                              className={`rounded-lg bg-background border-2 p-1.5 text-center transition-all ${selectedNetwork === n.id ? "border-primary" : "border-border"} ${pollingEnabled ? "opacity-50" : ""}`}
                            >
                              <img src={n.logo} alt={n.label} className="h-6 mx-auto object-contain" />
                              <p className="text-[8px] font-medium text-foreground mt-0.5">{n.label}</p>
                            </button>
                          ))}
                        </div>

                        {selectedNetwork && selectedNetwork !== "CARD" && !pollingEnabled && (
                          <div className="space-y-1">
                            <Label className="text-[10px] flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Numéro {selectedNetwork === "FLOOZ" ? "Moov" : "Togocel"}
                            </Label>
                            <Input
                              type="tel"
                              placeholder="+228 XX XX XX XX"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="h-8 text-xs"
                              disabled={pollingEnabled}
                            />
                          </div>
                        )}

                        {pollingEnabled && (
                          <div className="rounded-lg bg-muted/50 p-2 flex items-center gap-2">
                            {pollingStatus === "pending" && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                            {pollingStatus === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                            {(pollingStatus === "failed" || pollingStatus === "expired") && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                            <span className="text-[10px] font-medium">
                              {pollingStatus === "pending" ? `Vérification... (${attempts}/60)` : pollingStatus === "completed" ? "Confirmé !" : "Échoué"}
                            </span>
                          </div>
                        )}

                        {selectedNetwork && !pollingEnabled && (
                          <Button
                            variant="hero"
                            size="sm"
                            className="w-full gap-1.5 text-xs h-8"
                            disabled={!!subscribing}
                            onClick={() => initiatePayment(plan.id)}
                          >
                            {subscribing === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            Payer {price.toLocaleString()} FCFA
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => { setPaymentStep(null); setSubscribing(null); setPollingEnabled(false); }}
                          className="text-[10px] text-muted-foreground underline w-full text-center"
                        >
                          Annuler
                        </button>
                      </div>
                    )}

                    {!isPayingThis && (
                      <Button
                        variant={plan.popular ? "hero" : "outline"}
                        className="w-full gap-2 text-xs sm:text-sm h-9 sm:h-10"
                        disabled={isCurrent || !!subscribing}
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        {subscribing === plan.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isCurrent ? "Plan actuel" : plan.id === "enterprise" ? "Nous contacter" : (
                          <>{plan.id === "free" ? "Commencer" : "Choisir ce plan"}<ArrowRight className="w-3.5 h-3.5" /></>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-3 sm:px-4">
          <h2 className="font-heading text-lg sm:text-2xl font-bold text-center mb-6 sm:mb-12">Questions fréquentes</h2>
          <div className="max-w-3xl mx-auto space-y-3 sm:space-y-6">
            {[
              { q: "Puis-je changer de plan à tout moment ?", a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement." },
              { q: "Quelle est la différence entre mensuel et annuel ?", a: "Le plan annuel vous offre 2 mois gratuits soit environ 17% d'économie." },
              { q: "Comment fonctionne le paiement ?", a: "Nous acceptons Mobile Money (Flooz, T-Money) et cartes bancaires (Visa, Mastercard) via Paygate Global." },
              { q: "Puis-je annuler mon abonnement ?", a: "Oui, vous pouvez annuler à tout moment. Votre compte reste actif jusqu'à la fin de la période payée." },
              { q: "Le plan gratuit est-il vraiment limité à 3 produits ?", a: "Oui. Pour plus d'annonces, passez au plan Pro." },
              { q: "Comment fonctionnent les commissions ?", a: "NUKUCONNECT prélève une commission par vente: 8% Gratuit, 5% Pro, 3% Business, 2%+ Entreprise." },
              { q: "Dois-je m'abonner pour acheter ?", a: "Non ! Les acheteurs n'ont pas besoin d'abonnement. Les plans sont pour les fournisseurs." },
            ].map((faq) => (
              <div key={faq.q} className="bg-card rounded-xl p-4 sm:p-6 shadow-soft">
                <h3 className="font-heading font-semibold text-foreground mb-1 text-sm sm:text-base">{faq.q}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">{faq.a}</p>
              </div>
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
