import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  MessageSquare, 
  Brain, 
  GraduationCap, 
  QrCode, 
  Users,
  TrendingUp,
  Shield
} from "lucide-react";

const features = [
  {
    icon: ShoppingCart,
    title: "Marketplace Agricole",
    description: "Publiez et achetez des produits agricoles avec facilité. Recherche intelligente et filtres avancés.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: MessageSquare,
    title: "NUKU AI - Assistant 24/7",
    description: "Chatbot IA agricole qui répond à toutes vos questions sur les cultures, élevages et maladies.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Brain,
    title: "Recommandations IA",
    description: "Suggestions personnalisées basées sur votre localisation, préférences et historique d'achat.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: GraduationCap,
    title: "Formations Agricoles",
    description: "Cours en ligne, vidéos et certifications pour améliorer vos techniques agricoles.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: QrCode,
    title: "Traçabilité Complète",
    description: "Suivez vos produits de l'origine à la vente avec QR codes et historique détaillé.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Réseau de Confiance",
    description: "Système de notation et d'avis pour des transactions sécurisées entre partenaires vérifiés.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 lg:py-32 bg-gradient-earth">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Fonctionnalités
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Tout ce dont vous avez besoin pour{" "}
            <span className="text-primary">réussir</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Une plateforme complète qui combine technologie et agriculture pour 
            transformer votre activité.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              variant="feature"
              className="group cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 lg:p-8">
                <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Users, value: "15K+", label: "Utilisateurs actifs" },
            { icon: ShoppingCart, value: "100K+", label: "Produits listés" },
            { icon: TrendingUp, value: "98%", label: "Satisfaction client" },
            { icon: Shield, value: "100%", label: "Transactions sécurisées" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-heading text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
