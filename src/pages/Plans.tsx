import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Rocket, Zap, Star, ArrowRight } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Gratuit",
    price: "0",
    description: "Pour démarrer sur NUKUCONNECT",
    icon: Zap,
    color: "bg-muted",
    popular: false,
    features: [
      "Création de compte",
      "3 annonces produits",
      "Messagerie de base",
      "Accès au marketplace",
      "Support communautaire",
      "Formations gratuites",
    ],
    limitations: [
      "Pas de mise en avant",
      "Pas de statistiques avancées",
      "Pas de badge vérifié",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "9,900",
    period: "/mois",
    description: "Pour les producteurs actifs",
    icon: Star,
    color: "bg-primary",
    popular: true,
    features: [
      "Tout le plan Gratuit",
      "15 annonces produits",
      "Badge vérifié",
      "Mise en avant (3/mois)",
      "Statistiques de ventes",
      "Support prioritaire",
      "Formations premium",
      "QR codes traçabilité",
    ],
    limitations: [],
  },
  {
    id: "business",
    name: "Business",
    price: "29,900",
    period: "/mois",
    description: "Pour les entreprises agricoles",
    icon: Rocket,
    color: "bg-gradient-hero",
    popular: false,
    features: [
      "Tout le plan Pro",
      "Annonces illimitées",
      "Mise en avant illimitée",
      "Dashboard analytics avancé",
      "API d'intégration",
      "Account manager dédié",
      "Formation sur mesure",
      "Certification qualité",
    ],
    limitations: [],
  },
  {
    id: "enterprise",
    name: "Entreprise",
    price: "Sur devis",
    description: "Solutions personnalisées",
    icon: Crown,
    color: "bg-accent",
    popular: false,
    features: [
      "Tout le plan Business",
      "Infrastructure dédiée",
      "SLA garanti 99.9%",
      "Intégration ERP/CRM",
      "White-label possible",
      "Support 24/7",
      "Formation équipe",
      "Audit sécurité",
    ],
    limitations: [],
  },
];

const Plans = () => {
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-16 bg-gradient-earth">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            <Crown className="w-3 h-3 mr-1" />
            Plans & Tarifs
          </Badge>
          <h1 className="font-heading text-3xl lg:text-5xl font-bold text-foreground mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des solutions adaptées à chaque étape de votre croissance. 
            Commencez gratuitement et évoluez selon vos besoins.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden ${plan.popular ? "border-primary shadow-elevated" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="default" className="bg-primary">
                      Populaire
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-xl ${plan.color} flex items-center justify-center mb-4`}>
                    <plan.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <span className="font-heading text-4xl font-bold text-foreground">
                      {plan.price === "Sur devis" ? "" : `${plan.price}`}
                    </span>
                    {plan.price === "Sur devis" ? (
                      <span className="text-lg font-medium text-foreground">Sur devis</span>
                    ) : (
                      <>
                        <span className="text-muted-foreground"> FCFA</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <ul className="space-y-2 pt-4 border-t border-border">
                      {plan.limitations.map((limit) => (
                        <li key={limit} className="flex items-start gap-3 opacity-50">
                          <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">×</span>
                          <span className="text-sm text-muted-foreground">{limit}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button 
                    variant={plan.popular ? "hero" : "outline"} 
                    className="w-full gap-2"
                  >
                    {plan.id === "enterprise" ? "Nous contacter" : "Choisir ce plan"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-12">
            Questions fréquentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: "Puis-je changer de plan à tout moment ?",
                a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement."
              },
              {
                q: "Y a-t-il des frais cachés ?",
                a: "Non, tous les tarifs sont transparents. Vous ne payez que ce qui est indiqué, sans surprise."
              },
              {
                q: "Comment fonctionne le paiement ?",
                a: "Nous acceptons Mobile Money (TMoney, Flooz), cartes bancaires et virement. Le paiement est sécurisé."
              },
              {
                q: "Puis-je annuler mon abonnement ?",
                a: "Oui, vous pouvez annuler à tout moment sans frais. Votre compte reste actif jusqu'à la fin de la période payée."
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-card rounded-xl p-6 shadow-soft">
                <h3 className="font-heading font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
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
