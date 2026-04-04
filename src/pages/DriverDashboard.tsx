import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Truck, Package, MapPin, Clock, CheckCircle2, XCircle,
  DollarSign, Navigation, Star, Loader2, RefreshCw, Phone, MessageCircle,
  ShoppingBag, Settings, Wallet, ArrowDownToLine, History
} from "lucide-react";
import { Link } from "react-router-dom";
import DeliveryChat from "@/components/delivery/DeliveryChat";

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  accepted: { label: "Acceptée", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  picked_up: { label: "Récupérée", color: "bg-purple-100 text-purple-800", icon: Package },
  in_transit: { label: "En cours", color: "bg-orange-100 text-orange-800", icon: Navigation },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800", icon: XCircle },
};

const demoProducts = [
  { id: "demo-p1", name: "Tomates fraîches bio", price: 1500, unit: "kg", quantity_available: 50, location: "Lomé", images: ["https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=300&h=300&fit=crop"], profiles: { full_name: "Ama Djossou", location: "Lomé", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" } },
  { id: "demo-p2", name: "Maïs grain séché", price: 800, unit: "kg", quantity_available: 200, location: "Kara", images: ["https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=300&h=300&fit=crop"], profiles: { full_name: "Koffi Mensah", location: "Kara", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" } },
  { id: "demo-p3", name: "Ananas sucré", price: 2000, unit: "pièce", quantity_available: 30, location: "Kpalimé", images: ["https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=300&h=300&fit=crop"], profiles: { full_name: "Yawa Agbéko", location: "Kpalimé", avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" } },
  { id: "demo-p4", name: "Huile de palme", price: 3500, unit: "litre", quantity_available: 100, location: "Atakpamé", images: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop"], profiles: { full_name: "Komi Lawson", location: "Atakpamé", avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" } },
  { id: "demo-p5", name: "Manioc frais", price: 500, unit: "kg", quantity_available: 150, location: "Sokodé", images: ["https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=300&h=300&fit=crop"], profiles: { full_name: "Ablavi Tossou", location: "Sokodé", avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" } },
];

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: profileLoading, isReady } = useProfile();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [driverPosition, setDriverPosition] = useState<[number, number]>([6.1725, 1.2314]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const firstName = profile?.full_name?.split(" ")[0] || "Livreur";

  const fetchDriverData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch driver profile
      const { data: dp } = await supabase
        .from("driver_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setDriverProfile(dp);

      if (dp) {
        // Fetch available deliveries (pending, no driver)
        const { data: available } = await supabase
          .from("deliveries" as any)
          .select("*")
          .eq("status", "pending")
          .is("driver_id", null)
          .order("created_at", { ascending: false });
        
        setAvailableDeliveries(available || []);

        // Fetch my deliveries
        const { data: mine } = await supabase
          .from("deliveries" as any)
          .select("*")
          .eq("driver_id", (dp as any).id)
          .order("created_at", { ascending: false });
        
        setMyDeliveries(mine || []);

        // Fetch available products for simulation
        const { data: products } = await supabase
          .from("products")
          .select("*, profiles!products_producer_id_fkey(full_name, location, avatar_url)")
          .order("created_at", { ascending: false })
          .limit(10);
        // Use demo products if none exist
        setAvailableProducts(products && products.length > 0 ? products : demoProducts);
      }
    } catch (err) {
      console.error("Error fetching driver data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isReady || profileLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    fetchDriverData();
    // Get driver position for map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {}, { timeout: 5000 }
      );
    }
  }, [user, profileLoading, fetchDriverData, navigate]);

  // Auto-update GPS position every 30 seconds when driver is available
  useEffect(() => {
    if (!driverProfile?.is_available || !driverProfile?.id) return;

    const updateGPS = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDriverPosition([lat, lng]);

          // Update driver_profiles with current position
          await supabase
            .from("driver_profiles")
            .update({ current_lat: lat, current_lng: lng })
            .eq("id", driverProfile.id);

          // Also update all active deliveries assigned to this driver
          await supabase
            .from("deliveries")
            .update({ driver_current_lat: lat, driver_current_lng: lng })
            .eq("driver_id", driverProfile.id)
            .in("status", ["accepted", "picked_up", "in_transit"]);
        },
        (err) => console.warn("GPS error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };

    // Initial update
    updateGPS();
    // Then every 30 seconds
    const interval = setInterval(updateGPS, 30000);
    return () => clearInterval(interval);
  }, [driverProfile?.is_available, driverProfile?.id]);

  // Realtime subscription for new deliveries
  useEffect(() => {
    const channel = supabase
      .channel("driver-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        fetchDriverData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDriverData]);

  const toggleAvailability = async () => {
    if (!driverProfile) return;
    setIsToggling(true);
    try {
      const newStatus = !driverProfile.is_available;
      
      // Update position if going available
      let updates: any = { is_available: newStatus };
      if (newStatus && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => 
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
          );
          updates.current_lat = pos.coords.latitude;
          updates.current_lng = pos.coords.longitude;
        } catch { /* ignore geolocation errors */ }
      }

      await supabase
        .from("driver_profiles" as any)
        .update(updates)
        .eq("id", driverProfile.id);
      
      setDriverProfile({ ...driverProfile, ...updates });
      toast({
        title: newStatus ? "Vous êtes en ligne !" : "Vous êtes hors ligne",
        description: newStatus ? "Vous recevrez les nouvelles livraisons." : "Vous ne recevrez plus de livraisons.",
      });
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de changer le statut.", variant: "destructive" });
    } finally {
      setIsToggling(false);
    }
  };

  const acceptDelivery = async (deliveryId: string) => {
    if (!driverProfile) return;
    try {
      const { error } = await supabase
        .from("deliveries" as any)
        .update({
          driver_id: driverProfile.id,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", deliveryId)
        .is("driver_id", null);

      if (error) throw error;
      toast({ title: "Livraison acceptée !", description: "Le client a été notifié." });
      fetchDriverData();
    } catch {
      toast({ title: "Erreur", description: "Cette livraison n'est plus disponible.", variant: "destructive" });
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "picked_up") updates.picked_up_at = new Date().toISOString();
      if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();

      await supabase.from("deliveries" as any).update(updates).eq("id", deliveryId);
      toast({ title: "Statut mis à jour", description: `Livraison ${statusLabels[newStatus]?.label || newStatus}` });
      fetchDriverData();
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    }
  };

  // Stats
  const completedDeliveries = myDeliveries.filter(d => d.status === "delivered");
  const totalEarnings = completedDeliveries.reduce((sum, d) => sum + (d.driver_fee || 0), 0);
  const activeDeliveries = myDeliveries.filter(d => ["accepted", "picked_up", "in_transit"].includes(d.status));

  if (profileLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Header with greeting and availability toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">Bienvenue dans votre espace livreur</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/settings">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Settings className="w-3.5 h-3.5" /> Paramètres
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {driverProfile?.is_available ? "En ligne" : "Hors ligne"}
              </span>
              <Switch
                checked={driverProfile?.is_available || false}
                onCheckedChange={toggleAvailability}
                disabled={isToggling}
              />
            </div>
          </div>
        </div>

        {/* Status banner */}
        {driverProfile?.is_available ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-700 font-medium">Vous êtes disponible pour des livraisons</span>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-red-700 font-medium">Vous êtes hors ligne — activez le switch pour recevoir des offres</span>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-lg font-bold">{completedDeliveries.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Revenus</span>
            </div>
            <p className="text-lg font-bold">{totalEarnings.toLocaleString()} F</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">En cours</span>
            </div>
            <p className="text-lg font-bold">{activeDeliveries.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Note</span>
            </div>
            <p className="text-lg font-bold">{driverProfile?.rating?.toFixed(1) || "5.0"}</p>
          </Card>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products" className="text-xs">
              Produits
            </TabsTrigger>
            <TabsTrigger value="available" className="text-xs">
              Dispo {availableDeliveries.length > 0 && `(${availableDeliveries.length})`}
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              En cours {activeDeliveries.length > 0 && `(${activeDeliveries.length})`}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">Histo</TabsTrigger>
          </TabsList>

          {/* Products to deliver */}
          <TabsContent value="products" className="space-y-3 mt-3">
            {!driverProfile?.is_available ? (
              <Card className="p-6 text-center">
                <XCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Mode hors ligne</p>
                <p className="text-xs text-muted-foreground">Passez en ligne pour voir les produits disponibles à livrer.</p>
              </Card>
            ) : availableProducts.length === 0 ? (
              <Card className="p-6 text-center">
                <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucun produit disponible</p>
              </Card>
            ) : (
              <>
                {/* Map showing product locations */}
                <Card className="overflow-hidden">
                  <div className="h-48 rounded-lg overflow-hidden">
                    <MapContainer
                      center={driverPosition}
                      zoom={12}
                      style={{ height: "100%", width: "100%" }}
                      zoomControl={false}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={driverPosition}>
                        <Popup>📍 Votre position</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </Card>
                <p className="text-xs text-muted-foreground">{availableProducts.length} produits disponibles à livrer</p>
                {availableProducts.map((product: any) => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-3 flex gap-3 items-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-primary font-semibold">{product.price?.toLocaleString()} F / {product.unit}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{product.location || product.profiles?.location || "Non spécifié"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {product.profiles?.avatar_url ? (
                            <img src={product.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[8px] text-primary font-bold">{(product.profiles?.full_name || "?")[0]}</span>
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground truncate">{product.profiles?.full_name || "Inconnu"}</span>
                        </div>
                      </div>
                      <Badge className="text-[10px] whitespace-nowrap flex-shrink-0">{product.quantity_available} {product.unit}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Available Deliveries */}
          <TabsContent value="available" className="space-y-3 mt-3">
            {!driverProfile?.is_available ? (
              <Card className="p-6 text-center">
                <XCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Vous êtes hors ligne</p>
                <p className="text-xs text-muted-foreground mb-3">Activez votre disponibilité pour voir les livraisons disponibles.</p>
                <Button variant="hero" size="sm" onClick={toggleAvailability} disabled={isToggling}>
                  {isToggling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Passer en ligne
                </Button>
              </Card>
            ) : availableDeliveries.length === 0 ? (
              <Card className="p-6 text-center">
                <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucune livraison disponible pour le moment</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchDriverData}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
                </Button>
              </Card>
            ) : (
              availableDeliveries.map((delivery: any) => (
                <Card key={delivery.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">Livraison #{delivery.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {delivery.distance_km ? `${delivery.distance_km.toFixed(1)} km` : "Distance inconnue"}
                          {delivery.estimated_minutes && ` • ~${delivery.estimated_minutes} min`}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {delivery.driver_fee?.toLocaleString() || 0} F
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        <span>{delivery.pickup_address || "Adresse de récupération"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                        <span>{delivery.dropoff_address || "Adresse de livraison"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" className="flex-1" onClick={() => acceptDelivery(delivery.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Accepter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Active Deliveries */}
          <TabsContent value="active" className="space-y-3 mt-3">
            {activeDeliveries.length === 0 ? (
              <Card className="p-6 text-center">
                <Truck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucune livraison active</p>
              </Card>
            ) : (
              activeDeliveries.map((delivery: any) => {
                const status = statusLabels[delivery.status] || statusLabels.pending;
                const StatusIcon = status.icon;
                return (
                  <Card key={delivery.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">Livraison #{delivery.id.slice(0, 8)}</p>
                          <Badge className={`${status.color} text-xs mt-1`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {delivery.driver_fee?.toLocaleString() || 0} F
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                          <span>{delivery.pickup_address || "Récupération"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                          <span>{delivery.dropoff_address || "Livraison"}</span>
                        </div>
                      </div>

                      {/* Map preview for active delivery */}
                      {delivery.dropoff_lat && delivery.dropoff_lng && (
                        <div className="h-32 rounded-lg overflow-hidden">
                          <MapContainer
                            center={[delivery.dropoff_lat, delivery.dropoff_lng]}
                            zoom={13}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={false}
                            attributionControl={false}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {delivery.pickup_lat && (
                              <Marker position={[delivery.pickup_lat, delivery.pickup_lng]}>
                                <Popup>Récupération</Popup>
                              </Marker>
                            )}
                            <Marker position={[delivery.dropoff_lat, delivery.dropoff_lng]}>
                              <Popup>Livraison</Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      )}

                      {/* Action buttons based on status */}
                      <div className="flex gap-2">
                        {delivery.status === "accepted" && (
                          <Button variant="hero" size="sm" className="flex-1"
                            onClick={() => updateDeliveryStatus(delivery.id, "picked_up")}>
                            <Package className="w-4 h-4 mr-1" /> Récupéré
                          </Button>
                        )}
                        {delivery.status === "picked_up" && (
                          <Button variant="hero" size="sm" className="flex-1"
                            onClick={() => updateDeliveryStatus(delivery.id, "in_transit")}>
                            <Navigation className="w-4 h-4 mr-1" /> En route
                          </Button>
                        )}
                        {delivery.status === "in_transit" && (
                          <Button variant="hero" size="sm" className="flex-1"
                            onClick={() => updateDeliveryStatus(delivery.id, "delivered")}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Livré
                          </Button>
                        )}
                        {delivery.dropoff_lat && delivery.dropoff_lng && (
                          <Button variant="outline" size="sm"
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${delivery.dropoff_lat},${delivery.dropoff_lng}`, "_blank")}>
                            <Navigation className="w-4 h-4" />
                          </Button>
                        )}
                        <DeliveryChat
                          deliveryId={delivery.id}
                          currentUserRole="driver"
                          otherPartyName="Client"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-3 mt-3">
            {completedDeliveries.length === 0 ? (
              <Card className="p-6 text-center">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucune livraison terminée</p>
              </Card>
            ) : (
              completedDeliveries.map((delivery: any) => (
                <Card key={delivery.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">#{delivery.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(delivery.delivered_at || delivery.created_at).toLocaleDateString("fr-FR")}
                        {delivery.distance_km && ` • ${delivery.distance_km.toFixed(1)} km`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">+{delivery.driver_fee?.toLocaleString() || 0} F</p>
                      <Badge className="bg-green-100 text-green-800 text-[10px]">Livrée</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default DriverDashboard;
