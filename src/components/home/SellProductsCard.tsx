import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import sellFarmer from "@/assets/sell-products-farmer.jpg";
import { useLanguage } from "@/contexts/LanguageContext";

const scrollToVendre = (e: React.MouseEvent) => {
  e.preventDefault();
  const el = document.getElementById("vendre");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const SellProductsCard = () => {
  const { t } = useLanguage();
  return (
    <section className="bg-background py-3">
      <div className="mx-auto px-3 max-w-6xl">
        <div className="relative overflow-hidden bg-card border border-border shadow-sm rounded-lg flex items-center gap-3 p-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-foreground font-bold text-sm leading-tight">
              {t("home.sellTitle")}
            </h3>
            <p className="text-muted-foreground text-[11px] mt-1 leading-snug line-clamp-2">
              {t("home.sellDesc")}
            </p>
            <a href="#vendre" onClick={scrollToVendre} className="inline-block mt-2">
              <Button variant="hero" size="sm" className="gap-1.5 rounded-md h-7 text-[11px] px-3">
                <Store className="w-3 h-3" />
                {t("home.startSelling")}
              </Button>
            </a>
          </div>
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
            <img
              src={sellFarmer}
              alt="Vendeur agricole NukuConnect"
              className="w-full h-full object-cover"
              loading="lazy"
              width={512}
              height={512}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SellProductsCard;
