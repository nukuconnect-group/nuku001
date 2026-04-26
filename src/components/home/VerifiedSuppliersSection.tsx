import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, MapPin, Store } from "lucide-react";

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
 * Section "Fournisseurs vérifiés" — style LinkedIn/Facebook Pages.
 * Cartes carrées compactes, image plein cadre, alignement uniforme.
 */
const VerifiedSuppliersSection = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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

  // Extraire pays depuis location (format "Ville, Pays" ou juste "Pays")
  const extractCountry = (location: string | null): string => {
    if (!location) return "Afrique";
    const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || "Afrique";
  };

  // Initiales pour fallback
  const getInitials = (name: string): string =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

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

        {/* Scroll horizontal — tailles uniformes, style LinkedIn */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 -mx-3 px-3 sm:-mx-4 sm:px-4 snap-x snap-mandatory scrollbar-hide">
          {suppliers.map((s) => {
            const displayName =
              s.business_name?.trim() || s.full_name?.trim() || "Fournisseur";
            const country = extractCountry(s.location);
            return (
              <Link
                key={s.id}
                to={`/producteur/${s.id}`}
                className="flex-shrink-0 w-[128px] sm:w-[148px] snap-start group"
              >
                <div className="rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-all flex flex-col h-full">
                  {/* Image carrée plein cadre — style LinkedIn */}
                  <div className="relative w-full aspect-square bg-muted overflow-hidden">
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt={displayName}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/15 flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl font-bold text-primary/70">
                          {getInitials(displayName)}
                        </span>
                      </div>
                    )}
                    {s.is_verified && (
                      <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md">
                        <ShieldCheck className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Infos — hauteur fixe pour alignement parfait */}
                  <div className="p-2 flex flex-col items-center text-center min-h-[78px] sm:min-h-[84px] justify-between">
                    <h3 className="font-semibold text-[11px] sm:text-xs text-foreground line-clamp-2 leading-tight">
                      {displayName}
                    </h3>
                    <div className="w-full mt-1 space-y-0.5">
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 line-clamp-1">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{country}</span>
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                        <span className="font-bold text-foreground">{s.product_count}</span> produit{s.product_count > 1 ? "s" : ""}
                      </p>
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

export default VerifiedSuppliersSection;
