import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import step1Image from "@/assets/step-1-create-account.jpg";
import step2Image from "@/assets/step-2-find-products.jpg";
import step3Image from "@/assets/step-3-order.jpg";
import step4Image from "@/assets/step-4-delivery.jpg";

const steps = [
  {
    title: "Créez votre compte",
    description: "Inscrivez-vous en quelques clics comme producteur ou acheteur.",
    image: step1Image,
    link: "/auth",
    linkText: "S'inscrire"
  },
  {
    title: "Trouvez vos produits",
    description: "Parcourez le marketplace et trouvez les produits agricoles locaux.",
    image: step2Image,
    link: "/marketplace",
    linkText: "Explorer"
  },
  {
    title: "Passez commande",
    description: "Contactez le producteur, négociez et achetez en toute sécurité.",
    image: step3Image,
    link: "/marketplace",
    linkText: "Acheter"
  },
  {
    title: "Recevez vos produits",
    description: "Suivez votre commande et recevez vos produits frais chez vous.",
    image: step4Image,
    link: "/suivi-livraison",
    linkText: "Suivre commande"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-10 sm:py-14 lg:py-20 bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
          <span className="inline-block px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3">
            Comment ça marche ?
          </span>
          <h2 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Achetez en <span className="text-primary">4 étapes simples</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground px-2">
            De la création de compte à la livraison, découvrez comment NUKUCONNECT simplifie vos achats agricoles.
          </p>
        </div>

        {/* Mobile: 1 per line, Desktop: 4 per line */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={step.title} 
              className="group bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300 border border-border flex sm:flex-col"
            >
              {/* Image */}
              <div className="relative w-28 sm:w-full aspect-square sm:aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 p-2 sm:p-3 flex-shrink-0">
                <img 
                  src={step.image} 
                  alt={step.title}
                  className="w-full h-full object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-foreground shadow-md">
                    {index + 1}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 sm:p-4 flex flex-col justify-center flex-1">
                <h3 className="font-heading text-sm sm:text-base font-bold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 line-clamp-2">
                  {step.description}
                </p>
                <Link 
                  to={step.link}
                  className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
                >
                  {step.linkText}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 sm:mt-8">
          <Link to="/auth">
            <Button variant="hero" size="lg" className="gap-2 text-xs sm:text-sm">
              Commencer maintenant
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
