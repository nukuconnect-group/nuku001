import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, MessageSquare, Brain, GraduationCap, QrCode, Users, TrendingUp, Shield
} from "lucide-react";

const features = [
  { icon: ShoppingCart, title: "Marketplace Agricole", description: "Publiez et achetez des produits agricoles avec facilité.", color: "text-primary", bgColor: "bg-primary/10" },
  { icon: MessageSquare, title: "NUKU AI - Assistant 24/7", description: "Chatbot IA qui répond à vos questions agricoles.", color: "text-accent", bgColor: "bg-accent/10" },
  { icon: Brain, title: "Recommandations IA", description: "Suggestions basées sur votre localisation et préférences.", color: "text-primary", bgColor: "bg-primary/10" },
  { icon: GraduationCap, title: "Formations Agricoles", description: "Cours en ligne et certifications pour vos techniques.", color: "text-accent", bgColor: "bg-accent/10" },
  { icon: QrCode, title: "Traçabilité Complète", description: "Suivez vos produits avec QR codes et historique.", color: "text-primary", bgColor: "bg-primary/10" },
  { icon: Users, title: "Réseau de Confiance", description: "Notation et avis pour des transactions sécurisées.", color: "text-accent", bgColor: "bg-accent/10" },
];

const FeaturesSection = () => {
  return (
    <section className="py-6 sm:py-10 lg:py-14 bg-gradient-earth">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-16">
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            Fonctionnalités
          </span>
          <h2 className="font-heading text-lg sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
            Tout pour <span className="text-primary">réussir</span>
          </h2>
          <p className="text-xs sm:text-base lg:text-lg text-muted-foreground px-2">
            Technologie et agriculture pour transformer votre activité.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card key={feature.title} variant="feature" className="group cursor-pointer">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${feature.bgColor} flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${feature.color}`} />
                </div>
                <h3 className="font-heading text-sm sm:text-lg lg:text-xl font-semibold text-foreground mb-1 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {[
            { icon: Users, value: "15K+", label: "Utilisateurs" },
            { icon: ShoppingCart, value: "100K+", label: "Produits" },
            { icon: TrendingUp, value: "98%", label: "Satisfaction" },
            { icon: Shield, value: "100%", label: "Sécurisé" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <p className="font-heading text-xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
