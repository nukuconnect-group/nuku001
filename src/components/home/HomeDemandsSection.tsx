import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HandCoins, ArrowRight, MapPin, Package, User, Plus } from "lucide-react";
import { useDemands } from "@/hooks/useDemands";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCategoryFallbackImage } from "@/lib/categoryFallbackImage";
import { useState } from "react";

/**
 * Demandes d'achat — version compacte avec scroll horizontal.
 * Affiche les vraies demandes + complète avec des exemples pro
 * pour toujours offrir un visuel riche aux fournisseurs.
 */
const DemandImage = ({ src, category, title }: { src?: string; category: string; title: string }) => {
  const [errored, setErrored] = useState(false);
  const finalSrc = !src || errored ? getCategoryFallbackImage(category, title) : src;
  return (
    <img
      src={finalSrc}
      alt={title}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
      onError={() => setErrored(true)}
    />
  );
};

const HomeDemandsSection = () => {
  const { data: demands = [], isLoading } = useDemands();
  const { formatPrice } = useLanguage();
  const PAGE_SIZE = 4;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (isLoading) return null;

  // Seulement les vraies demandes — pas de démo
  const allItems = demands.slice(0, 20).map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    quantity: d.quantity,
    unit: d.unit,
    budget: d.budget,
    location: d.location,
    profile: d.profile,
    image_url: (d as any).image_url,
  }));
  if (allItems.length === 0) return null;

  const finalItems = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  return (
    <section className="py-6 sm:py-10 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between mb-3 sm:mb-5 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
              <HandCoins className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-sm sm:text-xl font-bold text-foreground truncate">
                Demandes d'achat
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Les acheteurs cherchent — répondez directement
              </p>
            </div>
          </div>
          <Link to="/marketplace?tab=demands" className="flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-8">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {/* Scroll horizontal compact */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-3 -mx-3 px-3 sm:-mx-4 sm:px-4 snap-x snap-mandatory scrollbar-hide">
          {finalItems.map((d) => {
            const linkHref = `/marketplace?tab=demands&demandId=${d.id}`;
            return (
              <Link
                key={d.id}
                to={linkHref}
                className="flex-shrink-0 w-[260px] xs:w-[280px] sm:w-[340px] snap-start group"
              >
                <div className="rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-all flex flex-row h-[120px] sm:h-[130px] max-w-full">
                  {/* Image rectangulaire à gauche — largeur fixe */}
                  <div className="relative h-full w-[100px] sm:w-[120px] flex-shrink-0 bg-muted overflow-hidden">
                    <DemandImage
                      src={d.image_url}
                      category={d.category}
                      title={d.title}
                    />
                    <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                      ACHAT
                    </span>
                  </div>

                  {/* Infos à droite — min-w-0 indispensable pour que truncate fonctionne */}
                  <div className="p-2 sm:p-2.5 flex-1 min-w-0 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {d.profile?.avatar_url ? (
                          <img src={d.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full border border-muted-foreground/40 flex items-center justify-center">
                            <User className="w-2.5 h-2.5 text-muted-foreground/60" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground truncate min-w-0 flex-1">
                        {d.profile?.full_name || "Acheteur"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[11px] sm:text-xs text-foreground line-clamp-2 mb-1 leading-snug break-words">
                      Besoin d'achat de {d.title.replace(/^(Recherche|Besoin d'achat de)\s+/i, "")}
                    </h3>
                    <div className="mt-auto space-y-0.5 min-w-0">
                      {d.quantity && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1 truncate">
                          <Package className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="font-medium text-foreground truncate">{d.quantity} {d.unit}</span>
                        </p>
                      )}
                      {d.budget && (
                        <p className="text-[10px] sm:text-xs font-bold text-primary truncate">
                          {formatPrice(d.budget)}
                        </p>
                      )}
                      {d.location && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate min-w-0">{d.location}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* "Voir plus" button — links to marketplace demands tab */}
        <div className="flex justify-center mt-3">
          <Link to="/marketplace?tab=demands">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Voir plus de demandes
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeDemandsSection;
