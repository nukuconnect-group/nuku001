import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, MapPin, Star, ShieldCheck, MessageCircle, Calendar,
  Package, ShoppingBag
} from "lucide-react";
import { Product } from "@/data/marketplace";

const ProducerProfile = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(name || "");

  // Fetch producer profile by name
  const { data: producer, isLoading: loadingProducer } = useQuery({
    queryKey: ["producer-profile", decodedName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("full_name", decodedName)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!decodedName,
  });

  // Fetch producer's products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["producer-products", producer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("producer_id", producer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!producer?.id,
  });

  // Fetch average rating from reviews
  const { data: avgRating } = useQuery({
    queryKey: ["producer-rating", producer?.id],
    queryFn: async () => {
      const productIds = products.map(p => p.id);
      if (!productIds.length) return 0;
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .in("product_id", productIds);
      if (!data?.length) return 0;
      return data.reduce((s, r) => s + r.rating, 0) / data.length;
    },
    enabled: products.length > 0,
  });

  // Map DB products to Product type for ProductCard
  const mappedProducts: Product[] = products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    unit: p.unit,
    quantity: p.quantity_available,
    location: p.location || producer?.location || "Togo",
    description: p.description || "",
    isOrganic: p.is_organic,
    image: p.images?.[0] || "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400",
    images: p.images || [],
    createdAt: p.created_at,
    producer: {
      id: producer?.id || "",
      name: producer?.full_name || "Producteur",
      avatar: producer?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      rating: avgRating || 4.5,
      verified: producer?.is_verified || false,
      bio: producer?.bio || "",
      phone: producer?.phone || "",
    },
  }));

  const isLoading = loadingProducer || loadingProducts;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!producer) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Fournisseur non trouvé</h1>
          <Link to="/producteurs"><Button variant="hero">Voir tous les fournisseurs</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const rating = avgRating || 0;

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="relative w-full h-32 sm:h-48 lg:h-56 bg-gradient-hero overflow-hidden">
          {producer.cover_url && (
            <img src={producer.cover_url} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        </div>

        <div className="container mx-auto px-4 -mt-20 sm:-mt-24 relative z-10">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">Retour</span>
          </button>
        </div>

        <div className="container mx-auto px-4 pb-12 -mt-8 sm:-mt-12 relative z-10">
          <Card className="mb-8 shadow-elevated">
            <CardContent className="p-6 lg:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <img
                  src={producer.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                  alt={producer.full_name || ""}
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-primary/20"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">{producer.full_name}</h1>
                    {producer.is_verified && (
                      <Badge className="bg-primary text-primary-foreground gap-1"><ShieldCheck className="w-3 h-3" />Vérifié</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    {rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-accent fill-accent" />
                        <span className="font-medium text-foreground">{rating.toFixed(1)}</span>/5
                      </span>
                    )}
                    {producer.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{producer.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Membre depuis {new Date(producer.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {producer.bio && <p className="text-muted-foreground mb-4">{producer.bio}</p>}
                  <Button variant="hero" className="gap-2" onClick={() => navigate(`/messages?seller=${encodeURIComponent(producer.full_name || "")}`)}>
                    <MessageCircle className="w-4 h-4" />Discuter
                  </Button>
                </div>
                <div className="flex md:flex-col gap-6 md:gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-heading text-2xl font-bold text-foreground">{products.length}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Produits</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {producer.location && (
            <Card className="mb-8">
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Localisation</CardTitle></CardHeader>
              <CardContent>
                <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><MapPin className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="font-medium text-foreground">{producer.location}</p>
                    <p className="text-sm text-muted-foreground">Livraison disponible dans la région</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="font-heading text-xl lg:text-2xl font-bold text-foreground mb-6">
              Produits de {producer.full_name} ({products.length})
            </h2>
            {mappedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {mappedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} hideProducer />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted rounded-xl">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun produit disponible pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProducerProfile;
