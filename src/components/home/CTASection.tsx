import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 lg:py-32 bg-gradient-earth relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto mb-8 shadow-elevated">
            <Leaf className="w-10 h-10 text-primary-foreground" />
          </div>

          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Prêt à transformer votre{" "}
            <span className="text-primary">activité agricole</span> ?
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Rejoignez des milliers de producteurs et acheteurs qui font confiance 
            à NUKUCONNECT pour développer leur activité. Inscription gratuite et sans engagement.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              Créer mon compte gratuit
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="xl">
              Contacter notre équipe
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Ils nous font confiance</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-60">
              {["Ministère Agriculture", "FAO", "Banque Mondiale", "CEDEAO"].map((partner) => (
                <div key={partner} className="font-heading font-semibold text-foreground">
                  {partner}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
