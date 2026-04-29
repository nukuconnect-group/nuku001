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
const SAMPLE_DEMANDS = [
  {
    id: "demo-1",
    title: "Recherche 500 kg de maïs blanc",
    category: "Céréales",
    quantity: 500,
    unit: "kg",
    budget: 175000,
    location: "Lomé, Togo",
    profile: { full_name: "Boulangerie Étoile", avatar_url: null },
    image_url: "https://images.unsplash.com/photo-1601593768799-76d3ca2fbd58?w=400&q=80",
  },
  {
    id: "demo-2",
    title: "Tomates fraîches pour restaurant",
    category: "Légumes",
    quantity: 100,
    unit: "kg",
    budget: 60000,
    location: "Cotonou, Bénin",
    profile: { full_name: "Resto Le Palmier", avatar_url: null },
    image_url: "https://images.unsplash.com/photo-1546470427-227df1b44d44?w=400&q=80",
  },
  {
    id: "demo-3",
    title: "Poissons frais (tilapia) 200 kg/semaine",
    category: "Pisciculture",
    quantity: 200,
    unit: "kg",
    budget: 350000,
    location: "Abidjan, Côte d'Ivoire",
    profile: { full_name: "Chaîne SuperFrais", avatar_url: null },
    image_url: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=400&q=80",
  },
  {
    id: "demo-4",
    title: "Œufs de poule plein air — 2000 unités",
    category: "Aviculture",
    quantity: 2000,
    unit: "unités",
    budget: 240000,
    location: "Accra, Ghana",
    profile: { full_name: "Hôtel Akwaaba", avatar_url: null },
    image_url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80",
  },
];

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

  if (isLoading) return null;

  // Combiner les vraies demandes + exemples pour toujours avoir 4+ items
  const realDemands = demands.slice(0, 8).map((d) => ({
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
  const items = [...realDemands, ...SAMPLE_DEMANDS].slice(0, Math.max(realDemands.length, 4) + (realDemands.length < 4 ? 4 - realDemands.length : 0));
  const finalItems = items.length >= 4 ? items : [...realDemands, ...SAMPLE_DEMANDS].slice(0, 8);

  if (finalItems.length === 0) return null;

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
            const isDemo = d.id.startsWith("demo-");
            const linkHref = isDemo ? "/marketplace?tab=demands" : "/marketplace?tab=demands";
            return (
              <Link
                key={d.id}
                to={linkHref}
                className="flex-shrink-0 w-[280px] sm:w-[340px] min-w-[280px] snap-start group"
              >
                <div className="rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-all flex flex-row h-[120px] sm:h-[130px]">
                  {/* Image rectangulaire à gauche */}
                  <div className="relative h-full w-[110px] sm:w-[130px] flex-shrink-0 bg-muted overflow-hidden">
                    <DemandImage
                      src={d.image_url}
                      category={d.category}
                      title={d.title}
                    />
                    <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                      ACHAT
                    </span>
                  </div>

                  <div className="p-2.5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {d.profile?.avatar_url ? (
                          <img src={d.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-2.5 h-2.5 text-accent" />
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground truncate">
                        {d.profile?.full_name || "Acheteur"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[11px] sm:text-xs text-foreground line-clamp-2 mb-1.5 leading-snug">
                      {d.title}
                    </h3>
                    <div className="mt-auto space-y-0.5">
                      {d.quantity && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                          📦 <span className="font-medium text-foreground">{d.quantity} {d.unit}</span>
                        </p>
                      )}
                      {d.budget && (
                        <p className="text-[10px] sm:text-xs font-bold text-primary">
                          {formatPrice(d.budget)}
                        </p>
                      )}
                      {d.location && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 line-clamp-1">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{d.location}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeDemandsSection;
