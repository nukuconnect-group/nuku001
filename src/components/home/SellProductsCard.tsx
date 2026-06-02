import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import sellFarmer from "@/assets/sell-products-farmer.jpg";

const SellProductsCard = () => {
  return (
    <section className="bg-background py-2 sm:py-3">
      <div className="mx-auto px-3 sm:px-4 max-w-6xl">
        <div className="relative overflow-hidden bg-card border border-border shadow-sm rounded-lg flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-foreground font-bold text-base sm:text-lg leading-tight">
              Vendez vos produits facilement
            </h3>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 leading-snug">
              Touchez plus d'acheteurs partout en Afrique.
            </p>
            <Link to="/become-seller" className="inline-block mt-2.5">
              <Button variant="hero" size="sm" className="gap-1.5 rounded-md">
                <Store className="w-3.5 h-3.5" />
                Commencer à vendre
              </Button>
            </Link>
          </div>
          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
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
