import SEO from "@/components/SEO";
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
import DriverBadges from "@/components/driver/DriverBadges";
import defaultAvatar from "@/assets/default-producer-avatar.png";
import ShareDialog from "@/components/share/ShareDialog";
import { shopShareUrl, shopCrawlerUrl } from "@/lib/shareOg";
import { useFollows, useProfileFollowerCount } from "@/hooks/useFollows";
import { useActiveBoosts, isProductBoosted } from "@/hooks/useBoosts";

import { buildShopSeoMeta } from "@/lib/socialMeta";
import UserPixels from "@/components/marketing/UserPixels";
import LocationBadge from "@/components/profile/LocationBadge";
import { useGeocodeLocation } from "@/hooks/useGeocodeLocation";
import PresenceIndicator from "@/components/profile/PresenceIndicator";
import { buildDirectionsUrl } from "@/lib/location";
import { 
  ArrowLeft, MapPin, Star, ShieldCheck, MessageCircle, Calendar,
  Package, ShoppingBag, Truck, User, Globe, Share2, Navigation, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const profileId = name || "";
  const isDemo = profileId.startsWith("demo-");
  const [shareOpen, setShareOpen] = useState(false);
  const { isFollowing, toggleFollow, isPending: followPending } = useFollows();
  const { data: activeBoosts = [] } = useActiveBoosts();



  const { data: producer, isLoading: loadingProducer } = useQuery({
    queryKey: ["producer-profile", profileId],
    queryFn: async () => {
      if (isDemo) return demoSuppliers[profileId] || null;
      const decodedName = decodeURIComponent(profileId);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(profileId);

      // 1) SECURITY DEFINER RPC — works for anon AND authenticated users,
      //    resolves either UUID or business/full name in a single roundtrip.
      const { data: rpcData } = await (supabase as any).rpc(
        "get_public_profile",
        { _id_or_name: isUUID ? profileId : decodedName },
      );
      const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (rpcRow) return rpcRow;

      // 2) Fallback direct queries (authenticated marketplace policy).
      if (isUUID) {
        const { data } = await supabase.from("profiles").select("*").eq("id", profileId).maybeSingle();
        if (data) return data;
      }
      const { data: byBusiness } = await supabase
        .from("profiles").select("*").ilike("business_name", decodedName).limit(1).maybeSingle();
      if (byBusiness) return byBusiness;
      const { data: byFullName } = await supabase
        .from("profiles").select("*").ilike("full_name", decodedName).limit(1).maybeSingle();
      return byFullName;
    },
    enabled: !!profileId,
    retry: 1,
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
      const { data } = await supabase.rpc("get_product_avg_rating" as any, { _product_ids: productIds });
      const rows = (data || []) as any[];
      if (!rows.length) return 0;
      let total = 0, count = 0;
      for (const r of rows) { total += Number(r.avg_rating) * Number(r.review_count); count += Number(r.review_count); }
      return count ? total / count : 0;
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

  // Fetch driver profile & ratings if this profile is a driver
  const { data: driverProfile } = useQuery({
    queryKey: ["driver-profile", producer?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("user_id", producer!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!producer?.user_id,
  });

  const { data: driverRatings = [] } = useQuery({
    queryKey: ["driver-ratings", driverProfile?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_driver_ratings" as any, { _driver_id: driverProfile!.id });
      return ((data || []) as any[]).map((r) => ({
        ...r,
        reviewer: { full_name: r.author_name, avatar_url: r.author_avatar_url },
      }));
    },
    enabled: !!driverProfile?.id,
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

  // CRITICAL: tous les hooks doivent être appelés AVANT les retours conditionnels (Rules of Hooks)
  const { data: geocoded, isLoading: geocoding } = useGeocodeLocation(producer?.location || "");
  const profileCoords: [number, number] | null = producer && (producer as any).lat && (producer as any).lng
    ? [(producer as any).lat, (producer as any).lng]
    : null;
  const coords: [number, number] | null = profileCoords || geocoded || null;
  const rating = avgRating || 0;
  const { data: followerCount = 0 } = useProfileFollowerCount(producer?.id);
  const following = producer?.id ? isFollowing(producer.id) : false;
  const boostedProducts = mappedProducts.filter(p => isProductBoosted(activeBoosts, p.id));
  const regularProducts = mappedProducts.filter(p => !isProductBoosted(activeBoosts, p.id));
  const shopName = ((producer as any)?.business_name || producer?.full_name || "Boutique").trim();

  const shopSeoMeta = buildShopSeoMeta({
    name: shopName,
    bio: producer?.bio,
    avatarUrl: producer?.avatar_url,
    coverUrl: producer?.cover_url,
    location: producer?.location,
  });

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
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="font-heading text-xl font-bold text-foreground">Boutique introuvable</h1>
          <p className="text-sm text-muted-foreground">Ce fournisseur n'existe pas ou n'est plus disponible.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/producteurs"><Button variant="hero">Voir tous les fournisseurs</Button></Link>
            <Link to="/dashboard"><Button variant="outline">Aller au tableau de bord</Button></Link>
            <Link to="/"><Button variant="ghost">Retour à l'accueil</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <SEO
        url={shopSeoMeta.path}
        title={shopSeoMeta.title || "Profil Fournisseur"}
        description={shopSeoMeta.description}
        image={shopSeoMeta.image}
        type="profile"
        jsonLd={shopSeoMeta.jsonLd}
      />
      <Header />
      <main>
        {/* Alibaba-style banner: cover + supplier identity overlay */}
        <div className="relative w-full h-40 sm:h-56 lg:h-72 bg-gradient-to-br from-primary via-primary/80 to-accent overflow-hidden">
          {producer.cover_url && (
            <img src={producer.cover_url} alt="cover" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="container mx-auto px-4 pt-3 relative z-10">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary-foreground hover:text-primary-foreground/80 transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" /><span className="text-xs sm:text-sm">Retour</span>
            </button>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 pb-12 -mt-16 sm:-mt-20 relative z-20">
          {/* Alibaba-style supplier card */}
          <Card className="mb-4 sm:mb-6 shadow-elevated overflow-hidden">
            <CardContent className="p-3 sm:p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-5">
                {/* Logo entreprise — toujours avatar réel ou défaut, jamais image aléatoire */}
                <div className="relative flex-shrink-0">
                  <img
                    src={producer.avatar_url || defaultAvatar}
                    alt={(producer as any).business_name || producer.full_name || ""}
                    className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-none object-cover border-2 border-card shadow-md bg-card"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultAvatar; }}
                  />
                  {producer.is_verified && (
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-9 sm:h-9 rounded-none bg-emerald-600 border-2 border-card flex items-center justify-center shadow-lg animate-pulse">
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                    </span>
                  )}
                </div>

                {/* Identité entreprise */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1.5 flex-wrap">
                    <h1 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                      {(producer as any).business_name || producer.full_name}
                    </h1>
                    {producer.is_verified ? (
                      <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white gap-1 text-[10px] sm:text-xs px-2 py-0.5 shadow-sm">
                        <ShieldCheck className="w-3 h-3" />Vérifié
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0.5 text-muted-foreground border-muted-foreground/40">
                        Non vérifié
                      </Badge>
                    )}
                  </div>

                  {/* Localisation TOUJOURS visible (composant unifié + fallback) */}
                  <div className="flex items-center gap-2 flex-wrap mb-2.5">
                    <LocationBadge location={producer.location} />
                    <PresenceIndicator lastActiveAt={(producer as any).last_seen_at || (producer as any).updated_at} />
                  </div>

                  {/* Stats horizontales secondaires */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground mb-2.5">
                    {rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                        <span className="font-bold text-foreground">{rating.toFixed(1)}</span>/5
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Depuis {new Date(producer.created_at).getFullYear()}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Clock className="w-3 h-3" />~ {(producer as any).response_time_hours || 2}h
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      ✓ {(producer as any).response_rate || 95}% réponse
                    </span>
                  </div>

                  {producer.bio && <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{producer.bio}</p>}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="hero" size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate(`/messages?contact=${producer.id}`)}>
                      <MessageCircle className="w-3.5 h-3.5" />Contacter
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                      <Star className="w-3.5 h-3.5" />Suivre
                    </Button>
                    {producer.location && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => {
                          const destLat = (producer as any).lat ?? coords[0];
                          const destLng = (producer as any).lng ?? coords[1];
                          const open = (originLat?: number, originLng?: number) => {
                            const url = buildDirectionsUrl({
                              destLat, destLng,
                              destText: producer.location,
                              originLat, originLng,
                            });
                            window.open(url, "_blank", "noopener");
                          };
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => open(pos.coords.latitude, pos.coords.longitude),
                              () => open(),
                              { timeout: 4000, maximumAge: 60000 },
                            );
                          } else {
                            open();
                          }
                        }}
                      >
                        <Navigation className="w-3.5 h-3.5" />Itinéraire
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => setShareOpen(true)}
                    >
                      <Share2 className="w-3.5 h-3.5" />Partager
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats grid bas - style Alibaba */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-4 border-t border-border">
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-0.5" />
                  <p className="font-heading text-base sm:text-xl font-bold text-foreground">{products.length}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Produits</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-0.5" />
                  <p className="font-heading text-base sm:text-xl font-bold text-foreground">{salesCount}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Ventes</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-accent mx-auto mb-0.5" />
                  <p className="font-heading text-base sm:text-xl font-bold text-foreground">{rating > 0 ? rating.toFixed(1) : "—"}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Note</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map Location — coordonnées réelles uniquement */}
          {producer.location && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Localisation — {producer.location}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {coords ? (
                    <MapContainer center={coords} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
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
                  ) : (
                    <p className="text-xs text-muted-foreground px-4 text-center">
                      {geocoding ? "Chargement de la carte…" : "Localisation précise non disponible pour cette adresse."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Driver Ratings History */}
          {driverProfile && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="w-5 h-5 text-primary" />
                  Évaluations livreur
                  {driverProfile.rating && (
                    <Badge variant="secondary" className="ml-auto gap-1">
                      <Star className="w-3 h-3 fill-accent text-accent" />
                      {Number(driverProfile.rating).toFixed(1)}/5
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {driverProfile.total_deliveries || 0} livraisons • {driverProfile.vehicle_type}
                </p>
                <DriverBadges rating={driverProfile.rating} totalDeliveries={driverProfile.total_deliveries} />
              </CardHeader>
              <CardContent className="space-y-3">
                {driverRatings.length > 0 ? (
                  driverRatings.map((r: any) => (
                    <div key={r.id} className="flex gap-3 p-3 rounded-lg border border-border">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {r.reviewer?.avatar_url ? (
                          <img src={r.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{r.reviewer?.full_name || "Client"}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s: number) => (
                              <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.comment}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune évaluation pour le moment</p>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="font-heading text-xl lg:text-2xl font-bold text-foreground mb-6">
              Produits de {(producer as any).business_name || producer.full_name} ({products.length})
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
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shopShareUrl(shopName, producer?.id)}
        previewUrl={shopCrawlerUrl(shopName, producer?.id)}
        title={shopName || "Boutique"}
        description={producer?.bio || `Voici la boutique ${shopName || "fournisseur"} sur NukuConnect.`}
      />
      {producer?.user_id && <UserPixels ownerUserId={producer.user_id} />}
    </div>
  );
};

export default ProducerProfile;
