import { useState, useMemo, useEffect } from "react";
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
  Search, MapPin, Star, ShieldCheck, MessageCircle,
  Users, Package, Loader2, Navigation, SlidersHorizontal
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const countries = [
  "Tous les pays", "Togo", "Ghana", "Bénin", "Côte d'Ivoire",
  "Burkina Faso", "Sénégal", "Mali", "Niger", "Cameroun", "Nigeria",
];

const sortOptions = [
  { value: "recent", label: "Plus récents" },
  { value: "rating", label: "Mieux notés" },
  { value: "products", label: "Plus de produits" },
  { value: "nearby", label: "Plus proches" },
];

const Producers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Tous les pays");
  const [sortBy, setSortBy] = useState("recent");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (sortBy === "nearby") {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [sortBy]);

  const demoProducers = [
    { id: "demo-1", user_id: "demo-1", name: "Agro Togo SARL", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200", cover: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800", location: "Lomé, Togo", verified: true, products: 24, bio: "Fournisseur de produits agricoles certifiés biologiques depuis 2015.", rating: 4.8, reviewCount: 47, createdAt: "2024-01-15" },
    { id: "demo-2", user_id: "demo-2", name: "Ferme Mensah & Fils", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", cover: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800", location: "Kpalimé, Togo", verified: true, products: 18, bio: "Exploitation familiale spécialisée en fruits tropicaux et épices.", rating: 4.6, reviewCount: 32, createdAt: "2024-03-20" },
    { id: "demo-3", user_id: "demo-3", name: "Coopérative AgriBio", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200", cover: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800", location: "Atakpamé, Togo", verified: false, products: 12, bio: "Coopérative de producteurs locaux regroupant 50 agriculteurs.", rating: 4.3, reviewCount: 19, createdAt: "2024-06-10" },
    { id: "demo-4", user_id: "demo-4", name: "Koffi Export", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200", cover: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800", location: "Sokodé, Togo", verified: true, products: 31, bio: "Leader dans l'exportation de café et cacao premium du Togo.", rating: 4.9, reviewCount: 63, createdAt: "2023-11-05" },
    { id: "demo-5", user_id: "demo-5", name: "Nature & Saveurs", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200", cover: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=800", location: "Lomé, Togo", verified: true, products: 15, bio: "Transformation et conditionnement de produits alimentaires locaux.", rating: 4.5, reviewCount: 28, createdAt: "2024-02-28" },
    { id: "demo-6", user_id: "demo-6", name: "Ets Adzovi", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200", cover: "https://images.unsplash.com/photo-1530836176759-510f58baebf4?w=800", location: "Tsévié, Togo", verified: false, products: 8, bio: "Jeune entreprise spécialisée dans les légumes frais et bio.", rating: 4.1, reviewCount: 11, createdAt: "2024-08-15" },
  ];

  const { data: producers = [], isLoading } = useQuery({
    queryKey: ["real-producers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "producer");

      if (error) throw error;
      if (!profiles || profiles.length === 0) return demoProducers;

      const producerIds = profiles.map((p) => p.id);
      const { data: products } = await supabase
        .from("products")
        .select("producer_id")
        .in("producer_id", producerIds);

      const productCounts: Record<string, number> = {};
      (products || []).forEach((p) => {
        productCounts[p.producer_id] = (productCounts[p.producer_id] || 0) + 1;
      });

      const { data: allProducts } = await supabase
        .from("products")
        .select("id, producer_id")
        .in("producer_id", producerIds);

      const productIds = (allProducts || []).map((p) => p.id);
      let avgRatings: Record<string, { sum: number; count: number }> = {};

      if (productIds.length > 0) {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("product_id, rating")
          .in("product_id", productIds);

        const productToProducer: Record<string, string> = {};
        (allProducts || []).forEach((p) => { productToProducer[p.id] = p.producer_id; });

        (reviews || []).forEach((r) => {
          const pid = productToProducer[r.product_id];
          if (pid) {
            if (!avgRatings[pid]) avgRatings[pid] = { sum: 0, count: 0 };
            avgRatings[pid].sum += r.rating;
            avgRatings[pid].count += 1;
          }
        });
      }

      const realProducers = profiles.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.full_name || "Fournisseur",
        avatar: p.avatar_url,
        cover: p.cover_url || p.cover_images?.[0] || null,
        location: p.location || "Non spécifié",
        verified: p.is_verified,
        products: productCounts[p.id] || 0,
        bio: p.bio || "",
        rating: avgRatings[p.id]
          ? Math.round((avgRatings[p.id].sum / avgRatings[p.id].count) * 10) / 10
          : 0,
        reviewCount: avgRatings[p.id]?.count || 0,
        createdAt: p.created_at,
      }));

      return realProducers.length > 0 ? realProducers : demoProducers;
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

    // Sort
    switch (sortBy) {
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case "products":
        result = [...result].sort((a, b) => b.products - a.products);
        break;
      case "recent":
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [producers, searchQuery, selectedCountry, sortBy]);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-earth">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Users className="w-3 h-3 mr-1" />
              Réseau de fournisseurs
            </Badge>
            <h1 className="font-heading text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Nos fournisseurs
            </h1>
            <p className="text-muted-foreground mb-8">
              Découvrez les fournisseurs actifs sur la plateforme et connectez-vous directement avec eux.
            </p>

            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un fournisseur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-3 border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredProducers.length}</span> fournisseur{filteredProducers.length > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Producers Grid — square professional cards */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProducers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-foreground mb-2">Aucun fournisseur trouvé</h3>
              <p className="text-sm text-muted-foreground">
                {producers.length === 0
                  ? "Aucun fournisseur n'est encore inscrit sur la plateforme."
                  : "Essayez de modifier vos filtres de recherche."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducers.map((producer) => (
                <Link key={producer.id} to={`/producteurs/${producer.id}`} className="block group">
                  <Card className="overflow-hidden h-full border-border/40 hover:border-primary/30 hover:shadow-elevated transition-all duration-300">
                    {/* Cover/Background — square aspect */}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {producer.cover ? (
                        <img
                          src={producer.cover}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10" />
                      )}
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Avatar centered */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform group-hover:scale-110 transition-transform duration-300">
                        {producer.avatar ? (
                          <img
                            src={producer.avatar}
                            alt={producer.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-card shadow-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 border-3 border-card shadow-lg flex items-center justify-center">
                            <Users className="w-7 h-7 text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Verified badge */}
                      {producer.verified && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary/90 text-primary-foreground text-[8px] px-1.5 py-0.5 gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" />Vérifié
                          </Badge>
                        </div>
                      )}

                      {/* Bottom info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
                        <h3 className="font-heading font-semibold text-white text-xs sm:text-sm truncate text-center">
                          {producer.name}
                        </h3>
                        <div className="flex items-center justify-center gap-1 text-white/80 text-[9px] sm:text-[10px] mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span className="truncate">{producer.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Info section */}
                    <CardContent className="p-2.5 sm:p-3 space-y-2">
                      {/* Stats row */}
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3 h-3" />
                          <span>{producer.products} produit{producer.products > 1 ? "s" : ""}</span>
                        </div>
                        {producer.rating > 0 && (
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-accent fill-accent" />
                            <span className="font-medium text-foreground">{producer.rating}</span>
                            <span className="text-muted-foreground">({producer.reviewCount})</span>
                          </div>
                        )}
                      </div>

                      {producer.bio && (
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {producer.bio}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="flex-1 text-[9px] sm:text-[10px] h-7">
                          Voir profil
                        </Button>
                        <Link to={`/messages?contact=${producer.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="hero" size="sm" className="h-7 px-2">
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
