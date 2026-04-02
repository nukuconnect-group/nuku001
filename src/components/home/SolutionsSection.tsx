import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, Globe, Handshake, GraduationCap } from "lucide-react";

const solutions = [
  {
    icon: Truck,
    title: "Livraison gratuite et rapide",
    description: "Recevez vos produits agricoles certifiés, directement chez vous, avec garantie de traçabilité.",
    cta: "Achetez maintenant",
    link: "/marketplace",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Globe,
    title: "Accès aux marchés locaux et internationaux",
    description: "Vendez et achetez en toute sécurité grâce à notre marketplace connectée.",
    cta: "Voir les magasins",
    link: "/marketplace",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Handshake,
    title: "Mise en relation professionnelle",
    description: "Trouvez des producteurs, fournisseurs, experts et partenaires pour développer votre activité.",
    cta: "Devenir vendeur",
    link: "/devenir-vendeur",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: GraduationCap,
    title: "Formations spécialisées",
    description: "Bénéficiez de programmes de formation en aquaculture et agriculture pour booster vos compétences.",
    cta: "Voir les formations",
    link: "/formations",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const SolutionsSection = () => {
  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-muted/20">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
          <h2 className="font-heading text-sm sm:text-base font-bold text-primary uppercase tracking-widest mb-2">
            NUKUCONNECT
          </h2>
          <h3 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-2 sm:mb-3 uppercase tracking-wide">
            Des solutions innovantes au service de votre croissance
          </h3>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
            Une plateforme unique qui connecte, forme et dynamise l'aquaculture et l'agriculture en Afrique et au-delà.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {solutions.map((sol) => (
            <div
              key={sol.title}
              className="bg-card border border-border rounded-xl p-4 sm:p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-300 group"
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${sol.bgColor} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <sol.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${sol.color}`} />
              </div>
              <h4 className="font-heading text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-1.5 sm:mb-2 leading-tight">
                {sol.title}
              </h4>
              <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4 flex-1">
                {sol.description}
              </p>
              <Link to={sol.link}>
                <Button size="sm" variant="hero" className="text-[10px] sm:text-xs uppercase font-semibold tracking-wide px-3 sm:px-4 py-1.5 sm:py-2">
                  {sol.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
