import { Link } from "react-router-dom";
import { Truck, Globe, Handshake, GraduationCap, ArrowUpRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const SolutionsSection = () => {
  const { t } = useLanguage();

  const solutions = [
    {
      icon: Truck,
      title: t("sol.delivery"),
      description: t("sol.deliveryDesc"),
      cta: t("sol.deliveryCta"),
      link: "/marketplace",
      tone: "primary" as const,
    },
    {
      icon: Globe,
      title: t("sol.markets"),
      description: t("sol.marketsDesc"),
      cta: t("sol.marketsCta"),
      link: "/marketplace",
      tone: "accent" as const,
    },
    {
      icon: Handshake,
      title: t("sol.connect"),
      description: t("sol.connectDesc"),
      cta: t("sol.connectCta"),
      link: "/devenir-fournisseur",
      tone: "primary" as const,
    },
    {
      icon: GraduationCap,
      title: t("sol.training"),
      description: t("sol.trainingDesc"),
      cta: t("sol.trainingCta"),
      link: "/formations",
      tone: "accent" as const,
    },
  ];

  const tones = {
    primary: {
      ring: "hover:border-primary/50",
      glow: "from-primary/12 via-primary/5 to-transparent",
      iconBg: "bg-primary/12 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
      bar: "bg-primary",
    },
    accent: {
      ring: "hover:border-accent/50",
      glow: "from-accent/12 via-accent/5 to-transparent",
      iconBg: "bg-accent/12 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
      bar: "bg-accent",
    },
  };

  return (
    <section className="hidden md:block relative overflow-hidden py-12 lg:py-20 bg-gradient-to-b from-muted/40 via-background to-background">
      {/* Ambient decoration */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[11px] font-semibold tracking-[0.14em] uppercase mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {t("home.solutionsBadge")}
          </span>
          <h2 className="font-heading text-2xl lg:text-4xl font-extrabold text-foreground tracking-tight mb-4">
            {t("home.solutionsTitleBefore")}{" "}
            <span className="relative inline-block text-primary">
              {t("home.solutionsTitleHighlight")}
              <span className="absolute left-0 -bottom-1 h-[3px] w-full rounded-full bg-gradient-hero opacity-70" />
            </span>
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t("home.solutionsDesc")}
          </p>
        </div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 items-stretch">
          {solutions.map((sol, idx) => {
            const tone = tones[sol.tone];
            return (
              <Link
                key={sol.title}
                to={sol.link}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated ${tone.ring}`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <span className={`absolute top-0 left-0 h-1 w-0 ${tone.bar} transition-all duration-500 group-hover:w-full`} />

                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${tone.iconBg}`}>
                      <sol.icon className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.8} />
                    </div>
                    <span className="font-heading text-2xl font-black leading-none text-muted-foreground/20 transition-colors group-hover:text-primary/25">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="font-heading text-[15px] lg:text-base font-bold text-foreground leading-snug mb-2">
                    {sol.title}
                  </h3>
                  <p className="text-xs lg:text-[13px] text-muted-foreground leading-relaxed mb-6 flex-1">
                    {sol.description}
                  </p>

                  <span className="mt-auto inline-flex items-center justify-between border-t border-border/70 pt-4 text-xs font-semibold text-primary">
                    {sol.cta}
                    <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
