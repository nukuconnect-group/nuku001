import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sprout, Truck, ArrowRight, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import heroSupplier from "@/assets/hero-supplier.jpg";

/**
 * Hero "Achat direct producteur" — visible uniquement sur tablette & ordinateur.
 * Image plein arrière-plan (producteurs à l'échelle industrielle) + texte aligné à gauche.
 */
const DirectFromFarmHero = () => {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden border-t border-border/40 min-h-[420px] sm:min-h-[480px] lg:min-h-[560px] flex items-center">
      {/* Background image — producteurs en interaction dans un champ */}
      <div className="absolute inset-0">
        <img
          src={heroSupplier}
          alt="Fournisseurs vérifiés — achetez directement auprès des producteurs sur Nukuconnect"
          className="w-full h-full object-cover object-[center_30%] sm:object-center"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Overlay adaptatif : plus sombre sur mobile pour lisibilité du texte, dégradé horizontal sur desktop */}
        <div className="absolute inset-0 bg-foreground/60 sm:bg-gradient-to-r sm:from-foreground/90 sm:via-foreground/70 sm:to-foreground/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-10 sm:py-14 md:py-16 lg:py-24 xl:py-28">
        <div className="max-w-2xl space-y-6 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25">
            <BadgeCheck className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("home.verifiedSuppliers")}
            </span>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.1]">
            {t("home.farmTitleBefore")} <span className="text-accent">{t("home.farmTitleHighlight")}</span>,
            <br className="hidden sm:block" />
            {t("home.farmTitleAfter")}
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed max-w-xl">
            {t("home.farmDesc")}
          </p>

          {/* Feature pills */}
          <div className="grid grid-cols-3 gap-3 max-w-xl pt-2">
            <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold">{t("home.verified100")}</p>
              <p className="text-[10px] text-white/75 leading-tight">
                {t("home.verified100Desc")}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold">{t("home.originGuaranteed")}</p>
              <p className="text-[10px] text-white/75 leading-tight">
                {t("home.originGuaranteedDesc")}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-primary/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold">{t("home.nukuDelivery")}</p>
              <p className="text-[10px] text-white/75 leading-tight">
                {t("home.nukuDeliveryDesc")}
              </p>
            </div>
          </div>

          {/* CTAs : sur la même ligne y compris sur mobile */}
          <div className="flex flex-row flex-nowrap items-center gap-2 sm:gap-3 pt-3">
            <Link to="/marketplace" className="flex-1 sm:flex-none min-w-0">
              <Button variant="hero" size="sm" className="w-full sm:w-auto gap-1.5 sm:gap-2 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-5">
                <span className="truncate">{t("home.buyFromProducers")}</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              </Button>
            </Link>
            <Link to="/producteurs" className="flex-1 sm:flex-none min-w-0">
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-5 bg-white/10 backdrop-blur-sm border-white/40 text-white hover:bg-white/20 hover:text-white"
              >
                <span className="truncate">{t("home.viewSuppliers")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectFromFarmHero;
