import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Smartphone, Search, ShoppingCart, Truck } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Smartphone,
    title: "Créez votre compte",
    description: "Inscrivez-vous en quelques clics comme producteur ou acheteur.",
    image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&q=80",
    link: "/auth",
    linkText: "S'inscrire"
  },
  {
    icon: Search,
    title: "Trouvez vos produits",
    description: "Parcourez le marketplace et trouvez les produits agricoles locaux.",
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&q=80",
    link: "/marketplace",
    linkText: "Explorer"
  },
  {
    icon: ShoppingCart,
    title: "Passez commande",
    description: "Contactez le producteur, négociez et achetez en toute sécurité.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80",
    link: "/marketplace",
    linkText: "Acheter"
  },
  {
    icon: Truck,
    title: "Recevez vos produits",
    description: "Suivez votre commande et recevez vos produits frais chez vous.",
    image: "https://images.unsplash.com/photo-1616432043562-3671ea2e5242?w=400&q=80",
    link: "/tracabilite",
    linkText: "Traçabilité"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Comment ça marche ?
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-4">
            Achetez en <span className="text-primary">4 étapes simples</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            De la création de compte à la livraison, découvrez comment NUKUCONNECT 
            simplifie vos achats agricoles.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <Card key={step.title} className="group overflow-hidden hover:shadow-elevated transition-all duration-300 border-primary/10">
              <div className="relative h-28 sm:h-36 lg:h-44 overflow-hidden">
                <img 
                  src={step.image} 
                  alt={step.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                  <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center text-xs sm:text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                </div>
              </div>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                  <step.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
                </div>
                <h3 className="font-heading text-sm sm:text-base lg:text-lg font-bold text-foreground mb-1 sm:mb-2 line-clamp-1">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                  {step.description}
                </p>
                <Link 
                  to={step.link}
                  className="text-xs sm:text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  {step.linkText}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-8 sm:mt-10 lg:mt-12">
          <Link to="/auth">
            <Button variant="hero" size="lg" className="gap-2 text-sm sm:text-base">
              Commencer maintenant
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
