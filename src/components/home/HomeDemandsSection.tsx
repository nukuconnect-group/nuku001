import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HandCoins, ArrowRight } from "lucide-react";
import DemandsList from "@/components/marketplace/DemandsList";
import { useDemands } from "@/hooks/useDemands";

/**
 * Section des demandes d'achat affichée sur la page d'accueil.
 * Permet aux fournisseurs de voir directement les besoins du marché.
 */
const HomeDemandsSection = () => {
  const { data: demands = [], isLoading } = useDemands();

  if (isLoading) return null;
  if (!demands.length) return null;

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                <HandCoins className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <h2 className="font-heading text-base sm:text-2xl font-bold text-foreground">
                Demandes d'achat en cours
              </h2>
            </div>
            <p className="text-[11px] sm:text-sm text-muted-foreground">
              Les acheteurs recherchent ces produits — répondez directement.
            </p>
          </div>
          <Link to="/marketplace?tab=demands" className="flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-8">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        <DemandsList limit={5} />
      </div>
    </section>
  );
};

export default HomeDemandsSection;
