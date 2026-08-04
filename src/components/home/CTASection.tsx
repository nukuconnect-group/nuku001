import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden py-10 sm:py-14 lg:py-20">
      <img
        src={heroFarmerVR}
        alt="Agriculteur africain avec casque de réalité virtuelle dans un champ high-tech"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        width={1920}
        height={1080}
      />
      {/* Legibility overlays (semantic tokens only) */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          {/* CTA card */}
          <div className="rounded-3xl border border-border/70 bg-card/80 px-5 py-8 text-center shadow-elevated backdrop-blur-md sm:px-10 sm:py-12">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero shadow-elevated sm:mb-7 sm:h-16 sm:w-16">
              <Rocket className="h-7 w-7 text-primary-foreground sm:h-8 sm:w-8" />
            </div>

            <h2 className="mx-auto max-w-3xl font-heading text-xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {t("home.ctaTitleBefore")}{" "}
              <span className="text-primary">{t("home.ctaTitleHighlight")}</span> ?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-base">
              {t("home.ctaDesc")}
            </p>

            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:items-center">
              <Link to="/auth" className="sm:w-auto">
                <Button variant="hero" size="lg" className="w-full min-w-[200px] text-sm sm:w-auto sm:text-base">
                  {t("home.ctaCreate")}
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Link to="/nuku-ai" className="sm:w-auto">
                <Button variant="outline" size="lg" className="w-full min-w-[200px] bg-background/70 text-sm sm:w-auto sm:text-base">
                  {t("home.ctaContact")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Partners */}
          <div className="mt-10 sm:mt-14">
            <div className="mb-6 flex items-center gap-3 sm:gap-4">
              <span className="h-px flex-1 bg-border" />
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
                {t("home.partnersTrust")}
              </p>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Grid — aligné et responsive (mobile → desktop) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 lg:gap-5">
              {partners.map((partner) => (
                <div
                  key={partner.name}
                  title={partner.name}
                  className="flex h-20 items-center justify-center rounded-xl border border-border/60 bg-card/90 px-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated sm:h-24"
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-h-10 w-auto max-w-full object-contain sm:max-h-14"
                    loading="lazy"
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
