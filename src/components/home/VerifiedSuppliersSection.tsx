import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, MapPin } from "lucide-react";

interface Supplier {
  id: string;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  cover_images: string[] | null;
  location: string | null;
  bio: string | null;
  is_verified: boolean;
  product_count: number;
}

/**
 * Fournisseurs vérifiés — style LinkedIn :
 * Bannière (cover) en arrière-plan + avatar rond superposé.
 * Affiche le nom d'entreprise et le pays réel (jamais "Afrique" générique).
 */
const VerifiedSuppliersSection = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, avatar_url, cover_url, cover_images, location, bio, is_verified")
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

  // Extraire le pays — uniquement à partir de location, sinon vide (jamais "Afrique" générique)
  const extractCountry = (location: string | null): string | null => {
    if (!location) return null;
    const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    return parts[parts.length - 1];
  };

  const getInitials = (name: string): string =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  // Couleurs de bannière par défaut (subtiles, dégradés agricoles)
  const COVER_GRADIENTS = [
    "linear-gradient(135deg, hsl(120, 60%, 35%), hsl(150, 50%, 45%))",
    "linear-gradient(135deg, hsl(200, 70%, 45%), hsl(180, 60%, 50%))",
    "linear-gradient(135deg, hsl(35, 80%, 50%), hsl(20, 75%, 55%))",
    "linear-gradient(135deg, hsl(160, 55%, 40%), hsl(120, 50%, 50%))",
    "linear-gradient(135deg, hsl(280, 40%, 50%), hsl(220, 50%, 55%))",
  ];

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

        {/* Scroll horizontal — cards style LinkedIn (cover + avatar rond) */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-3 -mx-3 px-3 sm:-mx-4 sm:px-4 snap-x snap-mandatory scrollbar-hide">
          {suppliers.map((s, idx) => {
            const displayName =
              s.business_name?.trim() || s.full_name?.trim() || "Fournisseur";
            const country = extractCountry(s.location);
            const coverImage =
              s.cover_url || (s.cover_images && s.cover_images[0]) || null;
            const coverFallback = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];
            const tagline =
              s.bio?.trim().split("\n")[0]?.slice(0, 50) ||
              `${s.product_count} produit${s.product_count > 1 ? "s" : ""} disponible${s.product_count > 1 ? "s" : ""}`;

            return (
              <Link
                key={s.id}
                to={`/producteur/${s.id}`}
                className="flex-shrink-0 w-[150px] sm:w-[170px] snap-start group"
              >
                <div className="rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg hover:border-primary/30 transition-all flex flex-col h-full">
                  {/* Cover (bannière) — hauteur fixe */}
                  <div
                    className="relative w-full h-14 sm:h-16 overflow-hidden"
                    style={!coverImage ? { background: coverFallback } : undefined}
                  >
                    {coverImage && (
                      <img
                        src={coverImage}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    {/* Voile dégradé pour lisibilité */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                  </div>

                  {/* Avatar rond superposé (style LinkedIn) */}
                  <div className="relative px-2 -mt-7 flex justify-center">
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-card bg-muted overflow-hidden shadow-md">
                        {s.avatar_url ? (
                          <img
                            src={s.avatar_url}
                            alt={displayName}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center">
                            <span className="text-base sm:text-lg font-bold text-primary">
                              {getInitials(displayName)}
                            </span>
                          </div>
                        )}
                      </div>
                      {s.is_verified && (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow ring-2 ring-card">
                          <ShieldCheck className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Infos — hauteur fixe pour alignement parfait */}
                  <div className="px-2 pt-1.5 pb-2.5 flex flex-col items-center text-center min-h-[80px] sm:min-h-[88px] justify-between">
                    <div className="w-full">
                      <h3 className="font-semibold text-[11px] sm:text-xs text-foreground line-clamp-1 leading-tight">
                        {displayName}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-2 leading-tight mt-0.5 min-h-[24px]">
                        {tagline}
                      </p>
                    </div>
                    {country && (
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-1 w-full">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-primary/70" />
                        <span className="truncate font-medium">{country}</span>
                      </p>
                    )}
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
