import SEO from "@/components/SEO";
import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, MapPin, Users, Package, Loader2, SlidersHorizontal,
  ShieldCheck, Flame, Sparkles, Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import networkHeroImg from "@/assets/network-hero.jpg";
import ProducerCard, { type ProducerLite } from "@/components/network/ProducerCard";
import NetworkCarousel from "@/components/network/NetworkCarousel";
import NetworkHeroStats from "@/components/network/NetworkHeroStats";
import OpportunitiesStrip from "@/components/network/OpportunitiesStrip";

const countries = [
  "Tous les pays", "Togo", "Ghana", "Bénin", "Côte d'Ivoire",
  "Burkina Faso", "Sénégal", "Mali", "Niger", "Cameroun", "Nigeria",
  "Kenya", "Tanzanie", "Rwanda", "Ouganda", "Éthiopie", "Afrique du Sud",
  "Madagascar", "Mozambique", "Congo", "Gabon", "Tchad", "Maroc", "Algérie", "Tunisie", "Égypte",
];

const sortOptions = [
  { value: "recent", labelKey: "net.mostRecent" },
  { value: "rating", labelKey: "net.bestRated" },
  { value: "products", labelKey: "net.mostProducts" },
];

const Producers = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Tous les pays");
  const [sortBy, setSortBy] = useState("recent");

  // Suppliers/Producers list (existing)
  const { data: producers = [], isLoading } = useQuery<ProducerLite[]>({
    queryKey: ["network-profiles-suppliers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "producer");

      if (error || !profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);
      const [productsRes, followsRes, ordersRes] = await Promise.all([
        supabase.from("products").select("producer_id").in("producer_id", profileIds),
        supabase.rpc("get_follower_counts" as any, { _profile_ids: profileIds }),
        supabase.from("orders").select("seller_id").in("seller_id", profileIds),
      ]);

      const productCounts: Record<string, number> = {};
      (productsRes.data || []).forEach((p: any) => {
        productCounts[p.producer_id] = (productCounts[p.producer_id] || 0) + 1;
      });
      const followerCounts: Record<string, number> = {};
      ((followsRes.data || []) as any[]).forEach((f: any) => {
        followerCounts[f.profile_id] = Number(f.follower_count) || 0;
      });
      const salesCounts: Record<string, number> = {};
      (ordersRes.data || []).forEach((o: any) => {
        salesCounts[o.seller_id] = (salesCounts[o.seller_id] || 0) + 1;
      });

      return profiles.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.business_name?.trim() || p.full_name?.trim() || t("net.suppliers"),
        avatar: p.avatar_url,
        cover: p.cover_url || p.cover_images?.[0] || null,
        location: p.location || "",
        verified: !!p.is_verified,
        products: productCounts[p.id] || 0,
        sales: salesCounts[p.id] || 0,
        bio: p.bio || "",
        followers: followerCounts[p.id] || 0,
        createdAt: p.created_at,
      }));
    },
    staleTime: 1000 * 60 * 2,
  });

  // Hero stats — counts across the platform
  const { data: heroStats } = useQuery({
    queryKey: ["network-hero-stats"],
    queryFn: async () => {
      const [suppliersRes, producersRes, buyersRes, verifiedRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "supplier"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "producer"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "buyer"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
      ]);
      return {
        suppliers: suppliersRes.count || 0,
        producers: producersRes.count || 0,
        buyers: buyersRes.count || 0,
        verified: verifiedRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Curated buckets for carousels
  const verifiedSet = useMemo(() => producers.filter((p) => p.verified).slice(0, 12), [producers]);
  const popularSet = useMemo(() => [...producers].sort((a, b) => b.followers - a.followers).slice(0, 12), [producers]);
  const recentSet = useMemo(() => [...producers].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 12), [producers]);
  const activeSet = useMemo(() => [...producers].sort((a, b) => b.products - a.products).slice(0, 12), [producers]);

  const filteredProducers = useMemo(() => {
    let result = producers.filter((producer) => {
      const matchesSearch =
        producer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        producer.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCountry =
        selectedCountry === "Tous les pays" ||
        producer.location.toLowerCase().includes(selectedCountry.toLowerCase());
      return matchesSearch && matchesCountry;
    });
    switch (sortBy) {
      case "products":
        result = [...result].sort((a, b) => b.products - a.products);
        break;
      case "recent":
        result = [...result].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      default:
        result = [...result].sort((a, b) => b.followers - a.followers);
    }
    return result;
  }, [producers, searchQuery, selectedCountry, sortBy]);

  const showCarousels = !searchQuery && selectedCountry === "Tous les pays" && producers.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO
        url="/producteurs"
        title="Réseau Nukuconnect — Producteurs et Fournisseurs Vérifiés"
        description="Découvrez et suivez les producteurs et fournisseurs agricoles vérifiés d'Afrique. Achetez en direct, contactez et collaborez."
      />
      <Header />

      {/* HERO with animated stats */}
      <section className="pt-24 pb-8 sm:pb-10 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={networkHeroImg} alt="Réseau NukuConnect" width={1600} height={640} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-background" />
        </div>
        <div className="container mx-auto px-4 relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="secondary" className="mb-3 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Users className="w-3 h-3 mr-1" />{t("net.badge")}
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {t("net.title")}
            </h1>
            <p className="text-sm sm:text-base text-white/85 mb-5">
              {t("net.subtitle")}
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t("net.searchSupplier")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11 text-sm shadow-lg"
              />
            </div>
          </motion.div>

          {heroStats && (
            <NetworkHeroStats
              // Harmonized minimums shown to the public, matching homepage hero
              suppliers={Math.max(heroStats.suppliers, 3000)}
              producers={Math.max(heroStats.producers, 2000)}
              buyers={Math.max(heroStats.buyers, 4600)}
              verified={Math.max(heroStats.verified, 500)}
            />
          )}
        </div>
      </section>

      {/* CAROUSELS — hidden when user is actively filtering */}
      {showCarousels && (
        <>
          {verifiedSet.length > 0 && (
            <NetworkCarousel
              title="Fournisseurs vérifiés"
              subtitle="Acteurs certifiés par Nukuconnect"
              icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
              accentClass="text-emerald-600 dark:text-emerald-400"
            >
              {verifiedSet.map((p, i) => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px]">
                  <ProducerCard producer={p} compact index={i} />
                </div>
              ))}
            </NetworkCarousel>
          )}

          {popularSet.length > 0 && (
            <NetworkCarousel
              title="Populaires"
              subtitle="Les plus suivis du réseau"
              icon={<Flame className="w-4 h-4 text-accent" />}
              accentClass="text-accent"
            >
              {popularSet.map((p, i) => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px]">
                  <ProducerCard producer={p} compact index={i} />
                </div>
              ))}
            </NetworkCarousel>
          )}

          <OpportunitiesStrip />

          {recentSet.length > 0 && (
            <NetworkCarousel
              title="Nouveaux arrivants"
              subtitle="Récemment inscrits sur Nukuconnect"
              icon={<Sparkles className="w-4 h-4 text-primary" />}
            >
              {recentSet.map((p, i) => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px]">
                  <ProducerCard producer={p} compact index={i} />
                </div>
              ))}
            </NetworkCarousel>
          )}

          {activeSet.length > 0 && (
            <NetworkCarousel
              title="Les plus actifs"
              subtitle="Avec le catalogue le plus riche"
              icon={<Star className="w-4 h-4 text-yellow-500" />}
              accentClass="text-yellow-600 dark:text-yellow-400"
            >
              {activeSet.map((p, i) => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px]">
                  <ProducerCard producer={p} compact index={i} />
                </div>
              ))}
            </NetworkCarousel>
          )}
        </>
      )}

      {/* SECTION TITLE + filters */}
      <section className="border-y border-border bg-card/60 backdrop-blur-sm sticky top-16 z-20">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between gap-3 py-2 sm:py-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Tout l'annuaire</span>
              <span className="text-xs text-muted-foreground">
                · <span className="font-semibold text-foreground">{filteredProducers.length}</span> {t("net.suppliers").toLowerCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 sm:w-36 h-8 sm:h-9 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-32 sm:w-36 h-8 sm:h-9 text-xs">
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country === "Tous les pays" ? t("net.allCountries") : country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProducers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-foreground mb-2">{t("net.noSupplier")}</h3>
              <p className="text-sm text-muted-foreground">{t("net.modifyFilters")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducers.map((producer, i) => (
                <ProducerCard key={producer.id} producer={producer} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Producers;
