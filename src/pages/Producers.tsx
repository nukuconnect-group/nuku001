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
  Search, MapPin, Star, ShieldCheck, MessageCircle,
  Filter, Users, Package, Navigation, Loader2, User
} from "lucide-react";
import { Link } from "react-router-dom";
import defaultAvatar from "@/assets/default-producer-avatar.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const countries = [
  "Tous les pays", "Togo", "Ghana", "Bénin", "Côte d'Ivoire",
  "Burkina Faso", "Sénégal", "Mali", "Niger", "Cameroun", "Nigeria",
];

const Producers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Tous les pays");

  // Fetch real producers who have at least 1 product
  const { data: producers = [], isLoading } = useQuery({
    queryKey: ["real-producers"],
    queryFn: async () => {
      // Get profiles of type producer
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "producer");

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      // For each producer, count their products
      const producerIds = profiles.map((p) => p.id);
      const { data: products } = await supabase
        .from("products")
        .select("producer_id")
        .in("producer_id", producerIds);

      const productCounts: Record<string, number> = {};
      (products || []).forEach((p) => {
        productCounts[p.producer_id] = (productCounts[p.producer_id] || 0) + 1;
      });

      // Get average ratings per producer via their products
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

      return profiles.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.full_name || "Fournisseur",
          avatar: p.avatar_url,
          location: p.location || "Non spécifié",
          verified: p.is_verified,
          products: productCounts[p.id] || 0,
          bio: p.bio || "",
          rating: avgRatings[p.id]
            ? Math.round((avgRatings[p.id].sum / avgRatings[p.id].count) * 10) / 10
            : 0,
          reviewCount: avgRatings[p.id]?.count || 0,
        }));
    },
    staleTime: 1000 * 60 * 2,
  });

  const filteredProducers = useMemo(() => {
    return producers.filter((producer) => {
      const matchesSearch =
        producer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        producer.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCountry =
        selectedCountry === "Tous les pays" ||
        producer.location.toLowerCase().includes(selectedCountry.toLowerCase());
      return matchesSearch && matchesCountry;
    });
  }, [producers, searchQuery, selectedCountry]);

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

            {/* Search */}
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
      <section className="py-4 border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredProducers.length}</span> fournisseur{filteredProducers.length > 1 ? "s" : ""}
            </p>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-48">
                <MapPin className="w-4 h-4 mr-2" />
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
      </section>

      {/* Producers Grid */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProducers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-foreground mb-2">Aucun producteur trouvé</h3>
              <p className="text-sm text-muted-foreground">
                {producers.length === 0
                  ? "Aucun producteur n'a encore publié de produit sur la plateforme."
                  : "Essayez de modifier vos filtres de recherche."}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducers.map((producer) => (
                <Card key={producer.id} className="group hover:shadow-elevated transition-all duration-300">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {producer.avatar ? (
                        <img
                          src={producer.avatar}
                          alt={producer.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <img
                          src={defaultAvatar}
                          alt={producer.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-border bg-primary/5"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading font-semibold text-foreground truncate">
                            {producer.name}
                          </h3>
                          {producer.verified && (
                            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="w-3 h-3" />
                          {producer.location}
                        </div>
                        <div className="flex items-center gap-3">
                          {producer.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                              <span className="text-xs font-medium">{producer.rating}</span>
                              <span className="text-[10px] text-muted-foreground">({producer.reviewCount})</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="w-3 h-3" />
                            {producer.products} produit{producer.products > 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    {producer.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {producer.bio}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Link to={`/producteurs/${producer.id}`} className="flex-1">
                        <Button variant="outline" className="w-full text-xs sm:text-sm">
                          Voir profil
                        </Button>
                      </Link>
                      <Link to={`/messages?contact=${producer.id}`}>
                        <Button variant="hero" className="gap-1.5 text-xs sm:text-sm">
                          <MessageCircle className="w-4 h-4" />
                          Contacter
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
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
