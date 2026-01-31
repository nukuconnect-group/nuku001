import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Smartphone, Search, ShoppingCart, Truck } from "lucide-react";

const steps = [
  {
    icon: Smartphone,
    title: "Créez votre compte",
    description: "Inscrivez-vous en quelques clics comme producteur ou acheteur.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80"
  },
  {
    icon: Search,
    title: "Trouvez vos produits",
    description: "Parcourez le marketplace et trouvez les produits agricoles qui vous intéressent.",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"
  },
  {
    icon: ShoppingCart,
    title: "Passez commande",
    description: "Contactez le producteur, négociez et passez votre commande en toute sécurité.",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80"
  },
  {
    icon: Truck,
    title: "Recevez vos produits",
    description: "Suivez votre commande et recevez vos produits avec traçabilité complète.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-4">
            Comment ça marche ?
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Achetez en <span className="text-primary">4 étapes simples</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            De la création de compte à la livraison, découvrez comment NUKUCONNECT 
            simplifie vos achats agricoles.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <Card key={step.title} className="group overflow-hidden hover:shadow-elevated transition-all duration-300">
              <div className="relative h-40 overflow-hidden">
                <img 
                  src={step.image} 
                  alt={step.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="hero" size="lg" className="gap-2">
            Commencer maintenant
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
