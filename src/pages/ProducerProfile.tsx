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
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Geocode locations to approximate coordinates
const locationCoords: Record<string, [number, number]> = {
  "lomé": [6.1725, 1.2314],
  "kara": [9.5511, 1.1861],
  "sokodé": [8.9833, 1.1333],
  "atakpamé": [7.5333, 1.1333],
  "kpalimé": [6.9000, 0.6333],
  "dapaong": [10.8625, 0.2075],
  "tsévié": [6.4167, 1.2167],
  "notsé": [6.9500, 1.1667],
  "togo": [6.1725, 1.2314],
  "accra": [5.6037, -0.1870],
  "ghana": [5.6037, -0.1870],
  "cotonou": [6.3654, 2.4183],
  "bénin": [6.3654, 2.4183],
  "abidjan": [5.3600, -4.0083],
  "côte d'ivoire": [5.3600, -4.0083],
  "dakar": [14.6928, -17.4467],
  "sénégal": [14.6928, -17.4467],
};

const getCoords = (location: string): [number, number] => {
  const loc = location.toLowerCase();
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (loc.includes(key)) return coords;
  }
  return [6.1725, 1.2314]; // Default to Lomé
};

const demoSuppliers: Record<string, any> = {
  "demo-1": { id: "demo-1", user_id: "demo-1", full_name: "Agro Togo SARL", avatar_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200", cover_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800", location: "Lomé, Togo", is_verified: true, bio: "Fournisseur de produits agricoles certifiés biologiques depuis 2015. Nous travaillons avec plus de 200 agriculteurs locaux.", phone: "+228 90 12 34 56", user_type: "producer", created_at: "2024-01-15T00:00:00Z" },
  "demo-2": { id: "demo-2", user_id: "demo-2", full_name: "Ferme Mensah & Fils", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", cover_url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800", location: "Kpalimé, Togo", is_verified: true, bio: "Exploitation familiale spécialisée en fruits tropicaux et épices depuis 3 générations.", phone: "+228 91 23 45 67", user_type: "producer", created_at: "2024-03-20T00:00:00Z" },
  "demo-3": { id: "demo-3", user_id: "demo-3", full_name: "Coopérative AgriBio", avatar_url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200", cover_url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800", location: "Atakpamé, Togo", is_verified: false, bio: "Coopérative de producteurs locaux regroupant 50 agriculteurs engagés dans l'agriculture durable.", phone: "+228 92 34 56 78", user_type: "producer", created_at: "2024-06-10T00:00:00Z" },
  "demo-4": { id: "demo-4", user_id: "demo-4", full_name: "Koffi Export", avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200", cover_url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800", location: "Sokodé, Togo", is_verified: true, bio: "Leader dans l'exportation de café et cacao premium du Togo vers l'Europe et l'Amérique.", phone: "+228 93 45 67 89", user_type: "producer", created_at: "2023-11-05T00:00:00Z" },
  "demo-5": { id: "demo-5", user_id: "demo-5", full_name: "Nature & Saveurs", avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200", cover_url: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=800", location: "Lomé, Togo", is_verified: true, bio: "Transformation et conditionnement de produits alimentaires locaux de qualité supérieure.", phone: "+228 94 56 78 90", user_type: "producer", created_at: "2024-02-28T00:00:00Z" },
  "demo-6": { id: "demo-6", user_id: "demo-6", full_name: "Ets Adzovi", avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200", cover_url: "https://images.unsplash.com/photo-1530836176759-510f58baebf4?w=800", location: "Tsévié, Togo", is_verified: false, bio: "Jeune entreprise spécialisée dans les légumes frais et bio, livraison rapide à Lomé.", phone: "+228 95 67 89 01", user_type: "producer", created_at: "2024-08-15T00:00:00Z" },
};

const demoProducts: Record<string, any[]> = {
  "demo-1": [
    { id: "dp-1", name: "Tomates Bio", category: "Légumes", price: 1500, unit: "kg", quantity_available: 200, location: "Lomé, Togo", description: "Tomates biologiques cultivées sans pesticides", is_organic: true, images: ["https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400"], created_at: "2024-06-01", producer_id: "demo-1" },
    { id: "dp-2", name: "Maïs Premium", category: "Céréales", price: 800, unit: "kg", quantity_available: 500, location: "Lomé, Togo", description: "Maïs de qualité supérieure", is_organic: false, images: ["https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400"], created_at: "2024-05-15", producer_id: "demo-1" },
  ],
  "demo-2": [
    { id: "dp-3", name: "Ananas Victoria", category: "Fruits", price: 2000, unit: "pièce", quantity_available: 100, location: "Kpalimé, Togo", description: "Ananas sucré de Kpalimé", is_organic: true, images: ["https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400"], created_at: "2024-07-01", producer_id: "demo-2" },
  ],
  "demo-4": [
    { id: "dp-4", name: "Café Robusta", category: "Boissons", price: 5000, unit: "kg", quantity_available: 300, location: "Sokodé, Togo", description: "Café robusta premium torréfié", is_organic: false, images: ["https://images.unsplash.com/photo-1447933601403-56dc6e10a689?w=400"], created_at: "2024-04-01", producer_id: "demo-4" },
    { id: "dp-5", name: "Cacao Fin", category: "Boissons", price: 7000, unit: "kg", quantity_available: 150, location: "Sokodé, Togo", description: "Cacao fin de saveur premium pour l'export", is_organic: true, images: ["https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400"], created_at: "2024-03-20", producer_id: "demo-4" },
  ],
};

const ProducerProfile = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const profileId = name || "";
  const isDemo = profileId.startsWith("demo-");

  const { data: producer, isLoading: loadingProducer } = useQuery({
    queryKey: ["producer-profile", profileId],
    queryFn: async () => {
      if (isDemo) return demoSuppliers[profileId] || null;
      // Try UUID match first
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(profileId);
      if (isUUID) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .maybeSingle();
        if (data) return data;
      }
      // Fallback: search by name
      const decodedName = decodeURIComponent(profileId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("full_name", decodedName)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["producer-products", producer?.id],
    queryFn: async () => {
      if (isDemo) return demoProducts[producer!.id] || [];
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

  const { data: salesCount = 0 } = useQuery({
    queryKey: ["producer-sales", producer?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", producer!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!producer?.id,
  });

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
      name: producer?.full_name || "Fournisseur",
      avatar: producer?.avatar_url || "",
      rating: avgRating || 4.5,
      verified: producer?.is_verified || false,
      bio: producer?.bio || "",
      phone: "",
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
  const coords = getCoords(producer.location || "Togo");

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
                  <Button variant="hero" className="gap-2" onClick={() => navigate(`/messages?contact=${producer.id}`)}>
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
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      <span className="font-heading text-2xl font-bold text-foreground">{salesCount}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Ventes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map Location */}
          {producer.location && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Localisation — {producer.location}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 rounded-lg overflow-hidden">
                  <MapContainer center={coords} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={coords}>
                      <Popup>
                        <strong>{producer.full_name}</strong><br />
                        {producer.location}
                      </Popup>
                    </Marker>
                  </MapContainer>
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
