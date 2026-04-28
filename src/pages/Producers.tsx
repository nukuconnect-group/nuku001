import SEO from "@/components/SEO";
import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, MapPin, ShieldCheck, MessageCircle,
  Users, Package, Loader2, SlidersHorizontal, UserPlus, UserCheck, TrendingUp, User
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFollows } from "@/hooks/useFollows";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import networkHeroImg from "@/assets/network-hero.jpg";
import defaultAvatar from "@/assets/default-producer-avatar.png";
import LocationBadge from "@/components/profile/LocationBadge";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, profile: myProfile } = useProfile();
  const { isFollowing, toggleFollow, isPending } = useFollows();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Tous les pays");
  const [sortBy, setSortBy] = useState("recent");

  const { data: producers = [], isLoading } = useQuery({
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
        supabase.from("follows").select("following_id").in("following_id", profileIds),
        supabase.from("orders").select("seller_id").in("seller_id", profileIds),
      ]);

      const productCounts: Record<string, number> = {};
      (productsRes.data || []).forEach((p) => {
        productCounts[p.producer_id] = (productCounts[p.producer_id] || 0) + 1;
      });

      const followerCounts: Record<string, number> = {};
      (followsRes.data || []).forEach((f) => {
        followerCounts[f.following_id] = (followerCounts[f.following_id] || 0) + 1;
      });

      const salesCounts: Record<string, number> = {};
      (ordersRes.data || []).forEach((o) => {
        salesCounts[o.seller_id] = (salesCounts[o.seller_id] || 0) + 1;
      });

      return profiles.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        // Affiche en priorité le nom d'entreprise (style Alibaba), sinon nom complet, sinon fallback
        name: p.business_name?.trim() || p.full_name?.trim() || t("net.suppliers"),
        avatar: p.avatar_url,
        cover: p.cover_url || p.cover_images?.[0] || null,
        location: p.location || "",
        verified: p.is_verified,
        products: productCounts[p.id] || 0,
        sales: salesCounts[p.id] || 0,
        bio: p.bio || "",
        followers: followerCounts[p.id] || 0,
        createdAt: p.created_at,
      }));
    },
    staleTime: 1000 * 60 * 2,
  });

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
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        result = [...result].sort((a, b) => b.followers - a.followers);
    }

    return result;
  }, [producers, searchQuery, selectedCountry, sortBy]);

  const handleFollow = async (e: React.MouseEvent, profileId: string, profileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth?returnTo=/producteurs");
      return;
    }
    if (myProfile?.id === profileId) return;
    try {
      await toggleFollow(profileId);
      const wasFollowing = isFollowing(profileId);
      toast({
        title: wasFollowing ? t("net.unsubscribed") : t("net.subscribed"),
        description: wasFollowing
          ? `${t("net.unsubscribeNotif")} ${profileName}.`
          : `${t("net.subscribeNotif")} ${profileName}.`,
      });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO
        url="/producteurs"
        title="Producteurs et Fournisseurs Vérifiés"
        description="Découvrez les producteurs et fournisseurs agricoles vérifiés d'Afrique. Suivez-les et achetez directement auprès d'eux."
      />
      <Header />

      {/* Hero with background image */}
      <section className="pt-24 pb-8 sm:pb-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={networkHeroImg} 
            alt="Réseau NukuConnect" width={1600} height={640} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30">
              <Users className="w-3 h-3 mr-1" />
              {t("net.badge")}
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {t("net.title")}
            </h1>
            <p className="text-sm sm:text-base text-white/80 mb-6">
              {t("net.subtitle")}
            </p>

            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t("net.searchSupplier")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content header */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-2.5">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{t("net.suppliers")}</span>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-3 border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredProducers.length}</span> {t("net.suppliers").toLowerCase()}
            </p>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 h-9 text-xs">
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
                <SelectTrigger className="w-36 h-9 text-xs">
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>{country === "Tous les pays" ? t("net.allCountries") : country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid - Pro card design inspired by uploaded reference */}
      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProducers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-foreground mb-2">
                {t("net.noSupplier")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("net.modifyFilters")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducers.map((producer) => {
                const following = isFollowing(producer.id);
                const isSelf = myProfile?.id === producer.id;

                return (
                  <Link key={producer.id} to={`/producteurs/${producer.id}`} className="block group">
                    <Card className="overflow-hidden h-full border-border/40 hover:border-primary/30 hover:shadow-elevated transition-all duration-300">
                      {/* Cover / background */}
                      <div className="relative h-20 sm:h-24 overflow-hidden bg-muted">
                        {producer.cover ? (
                          <img src={producer.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />

                        {/* Verified / Non verified badge top-right */}
                        <div className="absolute top-2 right-2">
                          {producer.verified ? (
                            <Badge className="bg-secondary text-secondary-foreground text-[8px] px-1.5 py-0.5 gap-0.5 shadow-sm">
                              <ShieldCheck className="w-2.5 h-2.5" /> Vérifié
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-card/80 text-muted-foreground text-[8px] px-1.5 py-0.5 gap-0.5 shadow-sm border-border">
                              Non vérifié
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Avatar overlapping cover - toujours avatar réel ou défaut, jamais image aléatoire */}
                      <div className="flex justify-center -mt-8 relative z-10">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-none overflow-hidden border-3 border-card shadow-lg bg-card">
                          <img
                            src={producer.avatar || defaultAvatar}
                            alt={producer.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultAvatar; }}
                          />
                        </div>
                      </div>

                      <CardContent className="p-2.5 sm:p-3 pt-1.5 text-center space-y-1.5">
                        <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm truncate">
                          {producer.name}
                        </h3>
                        <div className="flex justify-center">
                          <LocationBadge location={producer.location} size="sm" />
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-center gap-3 py-1.5">
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-bold text-primary">{producer.products}</p>
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Produits</p>
                          </div>
                          <div className="w-px h-6 bg-border" />
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-bold text-primary">{producer.sales}</p>
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Ventes</p>
                          </div>
                          <div className="w-px h-6 bg-border" />
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-bold text-primary">{producer.followers}</p>
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Abonnés</p>
                          </div>
                        </div>

                        {producer.bio && (
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {producer.bio}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-1.5 pt-1">
                          {!isSelf && (
                            <Button
                              variant={following ? "secondary" : "hero"}
                              size="sm"
                              className="flex-1 text-[9px] sm:text-[10px] h-7 gap-1"
                              onClick={(e) => handleFollow(e, producer.id, producer.name)}
                              disabled={isPending}
                            >
                              {following ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>{t("net.following")}</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3 h-3" />
                                  {t("net.follow")}
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline" size="sm" className="h-7 px-2 text-[9px] sm:text-[10px] gap-1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!user) { navigate("/auth?returnTo=/producteurs"); return; }
                              const greeting = encodeURIComponent(`Bonjour ${producer.name}, je vous contacte via NukuConnect pour discuter de vos produits.`);
                              navigate(`/messages?contact=${producer.id}&prefill=${greeting}`);
                            }}
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
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
