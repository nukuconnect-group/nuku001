import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import partnerEG from "@/assets/partner-energy-generation.png";
import partnerRT from "@/assets/partner-republique-togolaise.png";
import partnerTTI from "@/assets/partner-togo-top-impact.png";

const partners = [
  { name: "Energy Generation", logo: partnerEG },
  { name: "République Togolaise", logo: partnerRT },
  { name: "Togo Top Impact", logo: partnerTTI },
];

const CTASection = () => {
  return (
    <section className="py-12 sm:py-20 lg:py-28 relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #1c98ed 0%, #006b00 100%)" }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-elevated">
            <Rocket className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
          </div>

          <h2 className="font-heading text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-2">
            Prêt à transformer votre{" "}
            <span className="text-yellow-300">activité agricole</span> ?
          </h2>

          <p className="text-sm sm:text-lg text-white/80 mb-6 sm:mb-10 max-w-2xl mx-auto px-4">
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

          {/* Partners with logos */}
          <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">Ils nous font confiance</p>
            <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
              {partners.map((partner) => (
                <div key={partner.name} className="flex items-center justify-center grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-12 sm:h-16 lg:h-20 w-auto object-contain"
                  />
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
