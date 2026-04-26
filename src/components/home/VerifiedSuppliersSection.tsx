import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, MapPin, Store, Plus } from "lucide-react";

interface Supplier {
  id: string;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  location: string | null;
  is_verified: boolean;
  product_count: number;
}

/**
 * Section "Fournisseurs vérifiés" style Pages Facebook,
 * compacte avec scroll horizontal — adaptée au contexte africain.
 */
const VerifiedSuppliersSection = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Priorité aux vérifiés, puis aux plus actifs (par nombre de produits approuvés)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, avatar_url, location, is_verified")
        .eq("user_type", "producer")
        .order("is_verified", { ascending: false })
        .limit(20);

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Compter les produits approuvés par fournisseur
      const enriched = await Promise.all(
        profiles.map(async (p) => {
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("producer_id", p.id)
            .eq("moderation_status", "approved");
          return { ...p, product_count: count || 0 } as Supplier;
        })
      );

      // Trier : vérifié + actif d'abord
      const sorted = enriched
        .filter((s) => s.product_count > 0 || s.is_verified)
        .sort((a, b) => {
          if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
          return b.product_count - a.product_count;
        })
        .slice(0, 12);

      setSuppliers(sorted);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || suppliers.length === 0) return null;

  return (
    <section className="py-6 sm:py-10 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between mb-3 sm:mb-5 gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-sm sm:text-xl font-bold text-foreground truncate">
                Fournisseurs vérifiés
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Acteurs de confiance de l'agriculture africaine
              </p>
            </div>
          </div>
          <Link to="/producteurs" className="flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-8">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {/* Scroll horizontal style "Pages Facebook" */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-3 -mx-3 px-3 sm:-mx-4 sm:px-4 snap-x snap-mandatory scrollbar-hide">
          {suppliers.map((s) => {
            const displayName = s.business_name?.trim() || s.full_name?.trim() || "Fournisseur";
            return (
              <Link
                key={s.id}
                to={`/producteur/${s.id}`}
                className="flex-shrink-0 w-[150px] sm:w-[170px] snap-start group"
              >
                <div className="rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-all">
                  {/* Header avec logo/avatar + couverture compacte */}
                  <div className="relative h-14 sm:h-16 bg-gradient-to-br from-primary/30 to-secondary/20" />
                  <div className="px-2.5 pb-2.5 -mt-7 sm:-mt-8 flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-card bg-card overflow-hidden flex-shrink-0 shadow-sm">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Store className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-[11px] sm:text-xs text-foreground line-clamp-1 mt-1.5 flex items-center gap-1 justify-center">
                      <span className="truncate">{displayName}</span>
                      {s.is_verified && (
                        <ShieldCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      )}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1 mb-1.5">
                      {s.is_verified ? "Fournisseur vérifié" : "Producteur actif"}
                    </p>
                    {s.location && (
                      <p className="text-[9px] text-muted-foreground/80 flex items-center gap-0.5 mb-2 line-clamp-1">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{s.location}</span>
                      </p>
                    )}
                    <p className="text-[9px] text-muted-foreground mb-2">
                      <span className="font-bold text-foreground">{s.product_count}</span> produits
                    </p>
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full h-7 text-[10px] gap-1 bg-primary hover:bg-primary/90"
                    >
                      <Plus className="w-3 h-3" /> Suivre
                    </Button>
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

export default VerifiedSuppliersSection;
