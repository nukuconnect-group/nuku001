import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import step1Illustration from "@/assets/how-it-works-illustration.png.asset.json";
import step2Image from "@/assets/step-2-find-products.jpg";
import step3Image from "@/assets/step-3-order.jpg";
import step4Image from "@/assets/step-4-delivery.jpg";

const HowItWorksSection = () => {
  const { t } = useLanguage();
  const steps = [
    { title: t("home.step1Title"), description: t("home.step1Desc"), image: step1Illustration.url, link: "/auth", linkText: t("home.step1Link") },
    { title: t("home.step2Title"), description: t("home.step2Desc"), image: step2Image, link: "/marketplace", linkText: t("home.step2Link") },
    { title: t("home.step3Title"), description: t("home.step3Desc"), image: step3Image, link: "/marketplace", linkText: t("home.step3Link") },
    { title: t("home.step4Title"), description: t("home.step4Desc"), image: step4Image, link: "/suivi-livraison", linkText: t("home.step4Link") }
  ];

  return (
    <section id="vendre" className="py-6 sm:py-8 lg:py-12 bg-muted/30 scroll-mt-24">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
          <span className="inline-block px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3">
            {t("home.hiwBadge")}
          </span>
          <h2 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">
            {t("home.hiwTitleBefore")} <span className="text-primary">{t("home.hiwTitleHighlight")}</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground px-2">
            {t("home.hiwDesc")}
          </p>
        </div>



        {/* Mobile: 1 per line stacked, Desktop: 4 per line */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {steps.map((step, index) => (
            <div 
              key={step.title} 
              className="group bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300 border border-border"
            >
              {/* Image */}
              <div className="relative w-full aspect-[16/9] sm:aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5">
                <img 
                  src={step.image} 
                  alt={step.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md">
                    {index + 1}
                  </span>
                </div>
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col">
                <h3 className="font-heading text-sm sm:text-base font-bold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
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
              {t("hero.cta")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
