import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, Sprout, Store, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import defaultAvatar from "@/assets/default-producer-avatar.png";

interface VerifiedSupplier {
  id: string;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  user_type?: string | null;
}

const QUERY_KEY = ["verified-suppliers-bar"] as const;

/**
 * Mini-section "Réseau de confiance" — desktop & tablette uniquement.
 * Affiche compteurs SÉPARÉS (producteurs vs fournisseurs) + aperçu logos,
 * mis à jour en TEMPS RÉEL via Supabase Realtime sur la table profiles.
 */
const VerifiedSuppliersBar = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // Compteurs séparés en parallèle
      const [producersRes, suppliersRes, avatarsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_type", "producer"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_type", "supplier"),
        supabase
          .from("profiles")
          .select("id, full_name, business_name, avatar_url, is_verified, user_type")
          .in("user_type", ["producer", "supplier"])
          .order("is_verified", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      return {
        producers: producersRes.count ?? 0,
        suppliers: suppliersRes.count ?? 0,
        avatars: ((avatarsRes.data ?? []) as VerifiedSupplier[]),
      };
    },
    staleTime: 1000 * 60, // 1 min — realtime se charge des invalidations
  });

  // 🔴 Realtime : invalide la requête à chaque INSERT/UPDATE/DELETE sur profiles
  useEffect(() => {
    const channel = supabase
      .channel("verified-suppliers-bar-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Compteurs minimums "réseau" pour valoriser la plateforme.
  // 5 000 minimum partagés pour producteurs ET fournisseurs.
  const MIN_PRODUCERS = 5000;
  const MIN_SUPPLIERS = 5000;
  const realProducers = data?.producers ?? 0;
  const realSuppliers = data?.suppliers ?? 0;
  const producers = Math.max(MIN_PRODUCERS, MIN_PRODUCERS + realProducers);
  const suppliers = Math.max(MIN_SUPPLIERS, MIN_SUPPLIERS + realSuppliers);
  const allAvatars = data?.avatars ?? [];
  // Priorise ceux qui ont une photo, complète avec les autres pour atteindre min. 5
  const withAvatar = allAvatars.filter((a) => !!a.avatar_url);
  const withoutAvatar = allAvatars.filter((a) => !a.avatar_url);
  const avatars = [...withAvatar, ...withoutAvatar].slice(0, 8);
  const totalNetwork = producers + suppliers;
  // Affichage compact "+5K" pour le badge avatars
  const networkBadge = totalNetwork >= 1000
    ? `+${Math.floor(totalNetwork / 1000)}K`
    : `+${totalNetwork}`;

  return (
    <section className="-mt-px py-3 sm:py-4 lg:py-5 bg-card border-t border-border/30 border-b border-border/40">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 lg:gap-5">
          {/* Title + dual counters */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                Réseau de confiance · temps réel
              </p>
              <h3 className="font-heading text-sm sm:text-base lg:text-xl font-bold text-foreground leading-tight">
                Producteurs &amp; Fournisseurs Nukuconnect
              </h3>

              {/* Two separate counters — toujours sur la même ligne (mobile inclus) */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 flex-nowrap overflow-x-auto no-scrollbar">
                <CounterPill
                  icon={<Sprout className="w-3 h-3" />}
                  label="Producteurs"
                  value={producers}
                  isLoading={isLoading}
                  tone="primary"
                />
                <CounterPill
                  icon={<Store className="w-3 h-3" />}
                  label="Fournisseurs"
                  value={suppliers}
                  isLoading={isLoading}
                  tone="accent"
                />
              </div>
            </div>
          </div>

          {/* Logos avatars + CTA — alignés sur la même ligne */}
          <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 flex-shrink-0">
            {/* Avatars : visibles dès mobile, taille adaptative */}
            <div className="flex items-center">
              {isLoading ? (
                <div className="flex -space-x-2 sm:-space-x-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-muted animate-pulse border-2 border-card"
                    />
                  ))}
                </div>
              ) : (
                <Link to="/producteurs" className="flex -space-x-2 sm:-space-x-3 items-center">
                  {(avatars.length > 0
                    ? avatars.slice(0, 6)
                    : Array.from({ length: 5 }).map((_, i) => ({
                        id: `placeholder-${i}`,
                        avatar_url: null,
                        full_name: null,
                        business_name: null,
                        is_verified: false,
                      } as VerifiedSupplier))
                  ).map((s) => (
                    <div
                      key={s.id}
                      title={s.business_name || s.full_name || "Membre vérifié"}
                      className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full border-2 border-card overflow-hidden hover:scale-110 hover:z-10 transition-transform shadow-sm"
                    >
                      {s.avatar_url ? (
                        <img
                          src={s.avatar_url}
                          alt={s.business_name || s.full_name || "Membre"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            (e.currentTarget.parentElement as HTMLElement).classList.add("bg-transparent");
                          }}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full border-2 border-muted-foreground/40 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/60" strokeWidth={1.5} />
                        </div>
                      )}
                      {s.is_verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                          <ShieldCheck className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Badge réseau aligné avec les autres avatars */}
                  <div className="w-9 h-8 sm:w-11 sm:h-10 lg:w-12 lg:h-11 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-primary tabular-nums">
                    {networkBadge}
                  </div>
                </Link>
              )}
            </div>

            {/* CTA */}
            <Link to="/producteurs" className="flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 text-[11px] sm:text-sm h-8 sm:h-9">
                Voir le réseau
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// Counter pill — visuel compact pour chaque type
// ============================================================
interface CounterPillProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
  tone: "primary" | "accent";
}

const CounterPill = ({ icon, label, value, isLoading, tone }: CounterPillProps) => {
  const toneClasses =
    tone === "primary"
      ? "bg-primary/10 text-primary border-primary/30"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";

  return (
    <div
      className={`inline-flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border text-[9px] sm:text-xs whitespace-nowrap flex-shrink-0 ${toneClasses}`}
    >
      <span className="hidden xs:inline-flex">{icon}</span>
      {isLoading ? (
        <span className="inline-block h-3 w-8 bg-current/20 animate-pulse rounded" />
      ) : (
        <span className="font-bold tabular-nums">
          {value.toLocaleString("fr-FR")}
        </span>
      )}
      <span className="font-semibold">{label}</span>
    </div>
  );
};

export default VerifiedSuppliersBar;
