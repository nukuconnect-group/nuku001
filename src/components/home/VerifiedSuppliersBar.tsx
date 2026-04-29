import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import defaultAvatar from "@/assets/default-producer-avatar.png";

interface VerifiedSupplier {
  id: string;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
}

/**
 * Mini-section affichant un aperçu des fournisseurs vérifiés (logos + compteur).
 * Visible uniquement sur tablette et ordinateur, juste après le hero "achat direct".
 */
const VerifiedSuppliersBar = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["verified-suppliers-bar"],
    queryFn: async () => {
      // Compteur total de fournisseurs vérifiés
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_type", "supplier")
        .eq("is_verified", true);

      // Aperçu logos (8 max)
      const { data: suppliers } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, avatar_url")
        .eq("user_type", "supplier")
        .eq("is_verified", true)
        .not("avatar_url", "is", null)
        .limit(8);

      return {
        total: count ?? 0,
        suppliers: (suppliers ?? []) as VerifiedSupplier[],
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  // Toujours rendre quelque chose pour ne pas casser la mise en page (pas de white-flash)
  const total = data?.total ?? 0;
  const suppliers = data?.suppliers ?? [];

  return (
    <section className="hidden md:block py-6 lg:py-8 bg-card border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Title + count */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 lg:w-7 lg:h-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                Réseau de confiance
              </p>
              <h3 className="font-heading text-base lg:text-xl font-bold text-foreground leading-tight">
                Fournisseurs vérifiés Nukuconnect
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                {isLoading ? (
                  <span className="inline-block h-3 w-24 bg-muted animate-pulse rounded" />
                ) : (
                  <span>
                    <strong className="text-foreground font-bold">
                      {total.toLocaleString("fr-FR")}+
                    </strong>{" "}
                    producteurs et fournisseurs certifiés
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Logos avatars */}
          <div className="flex items-center gap-3 flex-1 lg:justify-center">
            {isLoading ? (
              <div className="flex -space-x-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-11 h-11 rounded-full bg-muted animate-pulse border-2 border-card"
                  />
                ))}
              </div>
            ) : suppliers.length > 0 ? (
              <div className="flex -space-x-3">
                {suppliers.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    title={s.company_name || s.full_name || "Fournisseur vérifié"}
                    className="relative w-11 h-11 lg:w-12 lg:h-12 rounded-full border-2 border-card bg-muted overflow-hidden hover:scale-110 hover:z-10 transition-transform shadow-sm"
                  >
                    <img
                      src={s.avatar_url || defaultAvatar}
                      alt={s.company_name || s.full_name || "Fournisseur"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = defaultAvatar;
                      }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                      <ShieldCheck className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                ))}
                {total > 6 && (
                  <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    +{Math.max(0, total - 6)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Bientôt disponible
              </p>
            )}
          </div>

          {/* CTA */}
          <Link to="/producteurs?verified=1" className="flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5">
              Voir tous les fournisseurs
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default VerifiedSuppliersBar;
