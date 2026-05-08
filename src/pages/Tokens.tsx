import SEO from "@/components/SEO";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Sparkles, Gift, Loader2, ShieldCheck, CheckCircle2, Clock, History, TrendingUp, AlertCircle, Crown, Rocket, Star, ArrowRight, Zap } from "lucide-react";
import { useTokens, TokenPack } from "@/hooks/useTokens";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import AskAdvisorButton from "@/components/premium/AskAdvisorButton";
import { usePremiumAlerts } from "@/hooks/usePremiumAlerts";
import { openMonerooPay } from "@/lib/moneroo";

const subscriptionPlans = [
  { id: "free", name: "Gratuit", price: 0, credits: 0, icon: Zap, popular: false, perks: ["5 produits", "Messagerie", "KYC vérifié"] },
  { id: "starter", name: "Starter", price: 2500, credits: 4, icon: Sparkles, popular: false, perks: ["15 produits", "4 crédits", "Traçabilité"] },
  { id: "standard", name: "Standard", price: 5000, credits: 8, icon: Star, popular: true, perks: ["30 produits", "8 crédits", "Stats avancées"] },
  { id: "premium", name: "Premium", price: 10000, credits: 20, icon: Rocket, popular: false, perks: ["Illimité", "20 crédits", "API + Conseiller"] },
];

const Tokens = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balance, packs, transactions, purchases, loading, userId, refresh } = useTokens();
  const { subscription } = useSubscription();
  usePremiumAlerts(userId);

  const [submitting, setSubmitting] = useState<string | null>(null);

  const startPayment = useCallback((pack: TokenPack) => {
    if (!userId) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour acheter des jetons." });
      navigate("/auth?returnTo=/jetons");
      return;
    }

    setSubmitting(pack.code);

    openMonerooPay({
      amount: pack.price_fcfa,
      description: `${pack.name} - ${pack.tokens + pack.bonus_tokens} jetons NukuConnect`,
      context: "tokens",
      contextData: { packCode: pack.code, packName: pack.name },
      onError: (msg) => {
        setSubmitting(null);
        toast({ title: "❌ Erreur de paiement", description: msg, variant: "destructive" });
      },
    });
  }, [userId, toast, navigate, refresh]);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/jetons" title="Jetons NukuConnect — Boostez vos produits" description="Achetez des jetons pour booster vos publications et activer la traçabilité. Packs Starter, Standard, Premium." />
      <Header />

      {/* Hero / Solde */}
      <section className="pt-4 sm:pt-12 pb-6 sm:pb-12 bg-gradient-earth">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-3 text-[11px] sm:text-sm">
              <Coins className="w-3 h-3 mr-1" /> Système de jetons
            </Badge>
            <h1 className="font-heading text-xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-3">Vos jetons NukuConnect</h1>
            <p className="text-xs sm:text-base text-muted-foreground mb-5 sm:mb-6">
              1 jeton = <span className="font-semibold text-foreground">625 FCFA</span> · Validité 12 mois · Boost & traçabilité
            </p>

            {userId && (
              <Card className="max-w-md mx-auto bg-gradient-hero text-primary-foreground border-0 shadow-elevated">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-xs sm:text-sm opacity-90 mb-1">Solde disponible</p>
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="w-7 h-7 sm:w-9 sm:h-9" />
                    <span className="font-heading text-3xl sm:text-5xl font-bold">{loading ? "…" : balance}</span>
                    <span className="text-sm sm:text-base opacity-90">jetons</span>
                  </div>
                  {balance <= 2 && balance >= 0 && !loading && (
                    <p className="mt-3 text-xs flex items-center justify-center gap-1 opacity-95">
                      <AlertCircle className="w-3 h-3" />
                      {balance === 0 ? "Solde épuisé — rechargez ci-dessous" : "Solde faible — pensez à recharger"}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center mt-4">
              <AskAdvisorButton context="tokens" variant="outline" />
            </div>
          </div>
        </div>
      </section>

      {/* Plans d'abonnement (vue compacte) */}
      <section className="py-8 sm:py-12 bg-muted/20">
        <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-2 text-[11px]"><Crown className="w-3 h-3 mr-1" /> Abonnements</Badge>
            <h2 className="font-heading text-lg sm:text-2xl font-bold">Choisissez aussi un plan d'abonnement</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Les jetons servent à booster ; l'abonnement débloque les fonctionnalités premium.
            </p>
            {subscription?.plan && (
              <Badge className="mt-2 bg-primary text-primary-foreground text-xs">
                Plan actuel : {subscription.plan}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {subscriptionPlans.map((p) => {
              const isCurrent = subscription?.plan === p.id;
              return (
                <Card
                  key={p.id}
                  className={`flex flex-col ${p.popular ? "border-primary shadow-elevated" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}
                >
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg ${p.popular ? "bg-primary" : "bg-muted"} flex items-center justify-center`}>
                        <p.icon className={`w-4 h-4 ${p.popular ? "text-primary-foreground" : "text-foreground"}`} />
                      </div>
                      {p.popular && <Badge className="text-[9px]">⭐ Top</Badge>}
                      {isCurrent && <Badge variant="outline" className="text-[9px]">Actuel</Badge>}
                    </div>
                    <CardTitle className="text-sm mt-2">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 flex-1 flex flex-col">
                    <div className="mb-2">
                      {p.price === 0 ? (
                        <span className="font-heading text-lg font-bold">Gratuit</span>
                      ) : (
                        <>
                          <span className="font-heading text-lg sm:text-xl font-bold">{p.price.toLocaleString("en-US")}</span>
                          <span className="text-[10px] text-muted-foreground"> FCFA/an</span>
                        </>
                      )}
                    </div>
                    <ul className="space-y-1 text-[10px] sm:text-[11px] text-muted-foreground flex-1">
                      {p.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-1">
                          <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                      {p.credits > 0 && (
                        <li className="flex items-start gap-1 text-primary font-medium">
                          <Gift className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>+{p.credits} crédits inclus</span>
                        </li>
                      )}
                    </ul>
                    <Button
                      variant={p.popular ? "hero" : "outline"}
                      size="sm"
                      className="w-full mt-3 gap-1 h-8 text-xs"
                      onClick={() => navigate(`/plans#${p.id}`)}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Plan actif" : <>Choisir <ArrowRight className="w-3 h-3" /></>}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="text-center mt-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/plans")} className="text-xs gap-1">
              Voir tous les plans détaillés <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Packs */}
      <section className="py-8 sm:py-14">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-2 text-[11px]"><Coins className="w-3 h-3 mr-1" /> Recharger des jetons</Badge>
            <h2 className="font-heading text-lg sm:text-2xl font-bold">Packs de jetons</h2>
            <p className="text-[10px] text-muted-foreground mt-1">🔒 Paiement sécurisé via Moneroo — Mobile Money, Visa, Mastercard</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {packs.map((pack) => {
              const totalTokens = pack.tokens + pack.bonus_tokens;
              const pricePerToken = Math.round(pack.price_fcfa / totalTokens);
              const isProcessing = submitting === pack.code;

              return (
                <Card key={pack.id} className={`relative overflow-hidden ${pack.is_popular ? "border-primary shadow-elevated ring-2 ring-primary" : ""}`}>
                  {pack.is_popular && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        <Sparkles className="w-3 h-3 mr-0.5" /> Populaire
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="p-4 sm:p-6 pb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Coins className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-base sm:text-lg">{pack.name}</CardTitle>
                    {pack.description && <p className="text-[11px] sm:text-xs text-muted-foreground">{pack.description}</p>}
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading text-2xl sm:text-4xl font-bold">{pack.price_fcfa.toLocaleString("en-US")}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">FCFA</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/30 text-primary text-[11px]">
                          {pack.tokens} jetons{pack.bonus_tokens > 0 && ` + ${pack.bonus_tokens} bonus`}
                        </Badge>
                        {pack.bonus_tokens > 0 && (
                          <Badge className="bg-accent text-accent-foreground text-[10px]">
                            <Gift className="w-3 h-3 mr-0.5" /> Bonus
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                        ≈ {pricePerToken.toLocaleString("en-US")} FCFA / jeton
                      </p>
                    </div>

                    <ul className="space-y-1.5 text-[11px] sm:text-xs">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />{totalTokens} jetons crédités</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />Valides 12 mois</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />Boost produit (1 jeton)</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />Traçabilité (1 jeton)</li>
                    </ul>

                    <Button
                      variant={pack.is_popular ? "hero" : "outline"}
                      className="w-full gap-2 text-xs sm:text-sm h-9 sm:h-10"
                      onClick={() => startPayment(pack)}
                      disabled={!!submitting}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Acheter {pack.price_fcfa.toLocaleString("en-US")} FCFA
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Historique */}
      {userId && (
        <section className="py-6 sm:py-12 bg-muted/30">
          <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2"><History className="w-4 h-4" /> Historique des transactions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 max-h-80 overflow-y-auto">
                  {transactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucune transaction</p>
                  ) : (
                    <ul className="space-y-2">
                      {transactions.map((tx) => (
                        <li key={tx.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{tx.reason ?? tx.type}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("fr-FR")}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-xs font-bold ${tx.amount > 0 ? "text-primary" : "text-destructive"}`}>
                              {tx.amount > 0 ? "+" : ""}{tx.amount}
                            </span>
                            <p className="text-[10px] text-muted-foreground">solde: {tx.balance_after}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Mes achats actifs</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 max-h-80 overflow-y-auto">
                  {purchases.filter(p => p.payment_status === "completed").length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucun achat actif</p>
                  ) : (
                    <ul className="space-y-2">
                      {purchases.filter(p => p.payment_status === "completed").map((p) => {
                        const expDate = new Date(p.expires_at);
                        const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / 86400000);
                        return (
                          <li key={p.id} className="border-b border-border pb-2 last:border-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium capitalize">{p.pack_code}</p>
                              <Badge variant="outline" className="text-[10px]">{p.tokens_remaining} / {p.tokens_purchased}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {daysLeft > 0 ? `Expire dans ${daysLeft} jours` : "Expiré"}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Tokens;
