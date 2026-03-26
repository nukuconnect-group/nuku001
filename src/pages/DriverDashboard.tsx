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
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Truck, Package, MapPin, Clock, CheckCircle2, XCircle,
  DollarSign, Navigation, Star, Loader2, RefreshCw, Phone, MessageCircle
} from "lucide-react";
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

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: profileLoading } = useProfile();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

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
      }
    } catch (err) {
      console.error("Error fetching driver data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (profileLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    fetchDriverData();
  }, [user, profileLoading, fetchDriverData, navigate]);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">Bienvenue dans votre espace livreur</p>
          </div>
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

        {/* Status banner */}
        {driverProfile?.is_available && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-700 font-medium">Vous êtes disponible pour des livraisons</span>
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

          {/* Available Deliveries */}
          <TabsContent value="available" className="space-y-3 mt-3">
            {availableDeliveries.length === 0 ? (
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
