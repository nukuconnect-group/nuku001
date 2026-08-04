import {
  ShoppingCart, MessageSquare, Brain, GraduationCap, QrCode, Users, TrendingUp, Shield
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const FeaturesSection = () => {
  const { t } = useLanguage();
  const features = [
    { icon: ShoppingCart, title: t("home.featureMarketplace"), description: t("home.featureMarketplaceDesc"), color: "text-primary", bgColor: "bg-primary/10" },
    { icon: MessageSquare, title: t("home.featureAssistant"), description: t("home.featureAssistantDesc"), color: "text-accent", bgColor: "bg-accent/10" },
    { icon: Brain, title: t("home.featureRecommendations"), description: t("home.featureRecommendationsDesc"), color: "text-primary", bgColor: "bg-primary/10" },
    { icon: GraduationCap, title: t("home.featureTraining"), description: t("home.featureTrainingDesc"), color: "text-accent", bgColor: "bg-accent/10" },
    { icon: QrCode, title: t("home.featureTraceability"), description: t("home.featureTraceabilityDesc"), color: "text-primary", bgColor: "bg-primary/10" },
    { icon: Users, title: t("home.featureNetwork"), description: t("home.featureNetworkDesc"), color: "text-accent", bgColor: "bg-accent/10" },
  ];

  return (
    <section className="py-6 sm:py-10 lg:py-14 bg-gradient-earth">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-16">
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {t("home.featuresBadge")}
          </span>
          <h2 className="font-heading text-lg sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
            {t("home.featuresTitleBefore")} <span className="text-primary">{t("home.featuresTitleHighlight")}</span>
          </h2>
          <p className="text-xs sm:text-base lg:text-lg text-muted-foreground px-2">
            {t("home.featuresDesc")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-soft backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-elevated sm:p-6 lg:p-7"
            >
              {/* accent glow */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
              <span className="absolute left-0 top-0 h-1 w-0 bg-gradient-hero transition-all duration-500 group-hover:w-full" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl ${feature.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className={`h-5 w-5 sm:h-7 sm:w-7 ${feature.color}`} strokeWidth={1.8} />
                </div>
                <span className="font-heading text-xl font-black leading-none text-muted-foreground/20 transition-colors group-hover:text-primary/25 sm:text-2xl">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="relative z-10 mt-3 font-heading text-sm font-bold leading-snug text-foreground sm:mt-5 sm:text-lg lg:text-xl">
                {feature.title}
              </h3>
              <p className="relative z-10 mt-1.5 flex-1 text-[11px] leading-relaxed text-muted-foreground sm:mt-2.5 sm:text-sm">
                {feature.description}
              </p>
            </article>
          ))}
        </div>


        <div className="mt-10 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {[
            { icon: Users, value: "15K+", label: t("home.users") },
            { icon: ShoppingCart, value: "100K+", label: t("mp.products") },
            { icon: TrendingUp, value: "98%", label: "Satisfaction" },
            { icon: Shield, value: "100%", label: t("home.secure") },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <p className="font-heading text-xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
