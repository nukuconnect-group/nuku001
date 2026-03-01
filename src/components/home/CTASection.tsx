import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf } from "lucide-react";
import { Link } from "react-router-dom";

const partners = [
  "Ministère Agriculture",
  "FAO",
  "Banque Mondiale",
  "CEDEAO",
  "BAD",
  "GIZ",
  "PNUD",
  "Union Européenne",
  "Gozem",
  "DHL Africa",
];

const CTASection = () => {
  return (
    <section className="py-12 sm:py-20 lg:py-28 bg-gradient-earth relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-elevated">
            <Leaf className="w-7 h-7 sm:w-10 sm:h-10 text-primary-foreground" />
          </div>

          <h2 className="font-heading text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2">
            Prêt à transformer votre{" "}
            <span className="text-primary">activité agricole</span> ?
          </h2>

          <p className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-10 max-w-2xl mx-auto px-4">
            Rejoignez des milliers de producteurs et acheteurs qui font confiance 
            à NUKUCONNECT pour développer leur activité.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link to="/auth">
              <Button variant="hero" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                Créer mon compte gratuit
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link to="/nuku-ai">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                Contacter notre équipe
              </Button>
            </Link>
          </div>

          {/* Partners scrolling */}
          <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">Ils nous font confiance</p>
            <div className="relative overflow-hidden">
              <div className="flex animate-scroll-x gap-8 sm:gap-12 whitespace-nowrap">
                {[...partners, ...partners].map((partner, i) => (
                  <div key={i} className="inline-flex items-center gap-2 flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs font-bold text-primary">
                        {partner.split(" ").map(w => w[0]).join("")}
                      </span>
                    </div>
                    <span className="font-heading font-semibold text-xs sm:text-sm text-foreground/70">
                      {partner}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
