import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import partnerEG from "@/assets/partner-energy-generation.png";
import partnerRT from "@/assets/partner-republique-togolaise.png";
import partnerTTI from "@/assets/partner-togo-top-impact.png";
import partnerKoko from "@/assets/partner-koko-international.png";
import partnerAHA from "@/assets/partner-africa-horizon.jpg";
import heroFarmerVR from "@/assets/hero-african-farmer-vr.jpg";

const partners = [
  { name: "Energy Generation", logo: partnerEG },
  { name: "République Togolaise", logo: partnerRT },
  { name: "Togo Top Impact", logo: partnerTTI },
  { name: "Koko International", logo: partnerKoko },
  { name: "Africa Horizon Aquatic", logo: partnerAHA },
];

const CTASection = () => {
  return (
    <section className="py-6 sm:py-10 lg:py-14 relative overflow-hidden">
      <img
        src={heroFarmerVR}
        alt="Agriculteur africain avec casque de réalité virtuelle dans un champ high-tech"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        width={1920}
        height={1080}
      />
      {/* Strong dark overlay for text legibility on any background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/80 to-background/90" />
      <div className="absolute inset-0 bg-foreground/10" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-elevated">
            <Rocket className="w-7 h-7 sm:w-10 sm:h-10 text-primary-foreground" />
          </div>

          <h2 className="font-heading text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 sm:mb-6 px-2 drop-shadow-[0_2px_8px_hsl(var(--background)/0.8)]">
            Prêt à transformer votre{" "}
            <span className="text-primary drop-shadow-[0_2px_8px_hsl(var(--background)/0.6)]">activité agricole</span> ?
          </h2>

          <p className="text-sm sm:text-lg text-foreground/90 font-medium mb-6 sm:mb-10 max-w-2xl mx-auto px-4 drop-shadow-[0_1px_4px_hsl(var(--background)/0.7)]">
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

          {/* Partners marquee */}
          <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">Ils nous font confiance</p>
            <div
              className="relative overflow-hidden w-full"
              style={{
                maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              }}
            >
              <div className="flex w-max gap-8 sm:gap-12 animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
                {[...partners, ...partners, ...partners].map((partner, idx) => (
                  <div
                    key={`${partner.name}-${idx}`}
                    className="flex-shrink-0 flex items-center justify-center bg-card/95 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-all duration-300 min-w-[140px] sm:min-w-[180px]"
                  >
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="h-10 sm:h-14 lg:h-16 w-auto object-contain"
                      loading="lazy"
                    />
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
