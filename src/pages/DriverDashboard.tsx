import SEO from "@/components/SEO";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Haversine distance in km */
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [driverPosition, setDriverPosition] = useState<[number, number]>([6.1725, 1.2314]);
  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawOperator, setWithdrawOperator] = useState("flooz");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const firstName = profile?.full_name?.split(" ")[0] || "Livreur";

  const fetchDriverData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch driver profile
      let { data: dp } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      // Auto-create driver profile if it doesn't exist
      if (!dp && profile) {
        const { data: profileData } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
        if (profileData) {
          const { data: newDp } = await supabase.from("driver_profiles").insert({
            user_id: user.id,
            profile_id: profileData.id,
            vehicle_type: "moto",
            is_available: false,
          }).select("*").single();
          dp = newDp;
        }
      }
      
      setDriverProfile(dp);

      if (dp) {
        // Fetch available deliveries (pending, no driver)
        const { data: available } = await supabase
          .from("deliveries")
          .select("*")
          .eq("status", "pending")
          .is("driver_id", null)
          .order("created_at", { ascending: false });
        
        setAvailableDeliveries(available || []);

        // Fetch my deliveries
        const { data: mine } = await supabase
          .from("deliveries")
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
        setAvailableProducts(products && products.length > 0 ? products : demoProducts);

        // Fetch withdrawals
        const { data: wds } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setWithdrawals(wds || []);
      }
    } catch (err) {
      console.error("Error fetching driver data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

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
        .from("driver_profiles")
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
        .from("deliveries")
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

  const rejectDelivery = async (deliveryId: string) => {
    // Simply hide this delivery from the driver's view by removing it from the local state
    setAvailableDeliveries(prev => prev.filter(d => d.id !== deliveryId));
    toast({ title: "Livraison rejetée", description: "Cette offre a été masquée de votre liste." });
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "picked_up") updates.picked_up_at = new Date().toISOString();
      if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();

      await supabase.from("deliveries").update(updates).eq("id", deliveryId);
      
      // If delivered, increment driver total_deliveries and total_earnings
      if (newStatus === "delivered" && driverProfile) {
        const delivery = myDeliveries.find(d => d.id === deliveryId);
        const fee = delivery?.driver_fee || 0;
        await supabase.from("driver_profiles").update({
          total_deliveries: (driverProfile.total_deliveries || 0) + 1,
          total_earnings: (driverProfile.total_earnings || 0) + fee,
        }).eq("id", driverProfile.id);
      }

      toast({ title: "Statut mis à jour", description: `Livraison ${statusLabels[newStatus]?.label || newStatus}` });
      
      if (newStatus === "delivered") {
        toast({ title: "💰 Gains crédités !", description: "Vos gains de livraison ont été ajoutés à votre solde." });
      }
      
      fetchDriverData();
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    }
  };

  // Stats
  const completedDeliveries = myDeliveries.filter(d => d.status === "delivered");
  const totalEarnings = completedDeliveries.reduce((sum, d) => sum + (d.driver_fee || 0), 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "completed").reduce((sum, w) => sum + w.amount, 0);
  const availableBalance = totalEarnings - totalWithdrawn;
  const activeDeliveries = myDeliveries.filter(d => ["accepted", "picked_up", "in_transit"].includes(d.status));
  const hasActiveDelivery = activeDeliveries.length > 0;

  const handleWithdrawal = async () => {
    if (!user || !profile) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > availableBalance) {
      toast({ title: "Montant invalide", description: `Solde disponible: ${availableBalance.toLocaleString()} FCFA`, variant: "destructive" });
      return;
    }
    if (!withdrawPhone.trim()) {
      toast({ title: "Numéro requis", description: "Entrez votre numéro de téléphone.", variant: "destructive" });
      return;
    }
    setIsWithdrawing(true);
    try {
      const { data: profileData } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!profileData) throw new Error("Profil introuvable");
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user.id,
        profile_id: profileData.id,
        amount,
        phone_number: withdrawPhone,
        operator: withdrawOperator,
      });
      if (error) throw error;
      toast({ title: "✅ Demande envoyée", description: `Retrait de ${amount.toLocaleString()} FCFA en cours de traitement.` });
      setWithdrawAmount("");
      fetchDriverData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (profileLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <SEO url="/driver-dashboard" title="Tableau de bord Livreur" description="Gérez vos livraisons, suivez vos gains et naviguez avec GPS vers les points de collecte et de livraison." noIndex />
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
              <span className="text-xs text-muted-foreground">Solde</span>
            </div>
            <p className="text-lg font-bold">{availableBalance.toLocaleString()} F</p>
            <p className="text-[9px] text-muted-foreground">Total: {totalEarnings.toLocaleString()} F</p>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="products" className="text-xs">
              Produits
            </TabsTrigger>
            <TabsTrigger value="available" className="text-xs">
              Dispo {availableDeliveries.length > 0 && `(${availableDeliveries.length})`}
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              En cours {activeDeliveries.length > 0 && `(${activeDeliveries.length})`}
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs">
              <Wallet className="w-3 h-3 mr-0.5" />Gains
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
            ) : hasActiveDelivery ? (
              <Card className="p-6 text-center">
                <Truck className="w-10 h-10 mx-auto text-orange-400 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Livraison en cours</p>
                <p className="text-xs text-muted-foreground">Terminez votre livraison actuelle pour voir de nouveaux produits.</p>
              </Card>
            ) : availableProducts.length === 0 ? (
              <Card className="p-6 text-center">
                <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucun produit disponible</p>
              </Card>
            ) : (
              <>
                <Card className="overflow-hidden relative z-0">
                  <div className="h-40 rounded-lg overflow-hidden relative z-0">
                    <MapContainer center={driverPosition} zoom={12} style={{ height: "100%", width: "100%", zIndex: 0 }} zoomControl={false} attributionControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={driverPosition}><Popup>📍 Votre position</Popup></Marker>
                    </MapContainer>
                  </div>
                </Card>
                <p className="text-xs text-muted-foreground">{availableProducts.length} produits disponibles à livrer</p>
                {availableProducts.map((product: any) => {
                  const prodLat = product.lat || 6.17;
                  const prodLng = product.lng || 1.23;
                  const dist = haversineKm(driverPosition[0], driverPosition[1], prodLat, prodLng);
                  return (
                    <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedProduct(product)}>
                      <CardContent className="p-3 flex gap-3 items-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-primary font-semibold">{product.price?.toLocaleString()} F / {product.unit}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{product.location || product.profiles?.location || "Non spécifié"}</span>
                            <span className="text-primary font-medium ml-auto flex-shrink-0">~{dist.toFixed(1)} km</span>
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
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Product Detail Dialog */}
          <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
            <DialogContent className="max-w-md">
              {selectedProduct && (() => {
                const prodLat = selectedProduct.lat || 6.17;
                const prodLng = selectedProduct.lng || 1.23;
                const distToSeller = haversineKm(driverPosition[0], driverPosition[1], prodLat, prodLng);
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-base">{selectedProduct.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {selectedProduct.images?.[0] && (
                        <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-48 object-cover rounded-lg" />
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-muted/50 rounded-lg p-2.5">
                          <p className="text-[10px] text-muted-foreground">Prix</p>
                          <p className="font-bold text-primary">{selectedProduct.price?.toLocaleString()} F/{selectedProduct.unit}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5">
                          <p className="text-[10px] text-muted-foreground">Stock</p>
                          <p className="font-bold">{selectedProduct.quantity_available} {selectedProduct.unit}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5">
                          <p className="text-[10px] text-muted-foreground">Distance fournisseur</p>
                          <p className="font-bold text-orange-600">{distToSeller.toFixed(1)} km</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5">
                          <p className="text-[10px] text-muted-foreground">Localité</p>
                          <p className="font-bold">{selectedProduct.location || selectedProduct.profiles?.location || "—"}</p>
                        </div>
                      </div>
                      {selectedProduct.description && (
                        <p className="text-xs text-muted-foreground">{selectedProduct.description}</p>
                      )}
                      <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
                        {selectedProduct.profiles?.avatar_url ? (
                          <img src={selectedProduct.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs text-primary font-bold">{(selectedProduct.profiles?.full_name || "?")[0]}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{selectedProduct.profiles?.full_name || "Fournisseur"}</p>
                          <p className="text-[10px] text-muted-foreground">{selectedProduct.profiles?.location || ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="hero" className="flex-1" onClick={() => {
                          navigate(`/produit/${selectedProduct.id}`);
                          setSelectedProduct(null);
                        }}>
                          <Package className="w-4 h-4 mr-1" /> Voir le produit
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedProduct(null)}>Fermer</Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>

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
            ) : hasActiveDelivery ? (
              <Card className="p-6 text-center">
                <Truck className="w-10 h-10 mx-auto text-orange-400 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Livraison en cours</p>
                <p className="text-xs text-muted-foreground">Vous avez une livraison active. Terminez-la avant d'en accepter une nouvelle.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                  const tabEl = document.querySelector('[data-state="inactive"][value="active"]') as HTMLElement;
                  tabEl?.click();
                }}>
                  <Truck className="w-4 h-4 mr-1" /> Voir ma livraison
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
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectDelivery(delivery.id)}>
                        <XCircle className="w-4 h-4 mr-1" /> Rejeter
                      </Button>
                    </div>
                    {/* Navigation to pickup */}
                    {delivery.pickup_lat && delivery.pickup_lng && (
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${delivery.pickup_lat},${delivery.pickup_lng}`, "_blank")}>
                        <Navigation className="w-3.5 h-3.5 mr-1" /> Itinéraire vers le point de collecte
                      </Button>
                    )}
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

                      {/* Map preview for active delivery with driver position */}
                      {(delivery.dropoff_lat && delivery.dropoff_lng) && (
                        <div className="h-36 rounded-lg overflow-hidden relative z-0">
                          <MapContainer
                            center={[
                              delivery.status === "accepted" && delivery.pickup_lat ? delivery.pickup_lat : delivery.dropoff_lat,
                              delivery.status === "accepted" && delivery.pickup_lng ? delivery.pickup_lng : delivery.dropoff_lng
                            ]}
                            zoom={13}
                            style={{ height: "100%", width: "100%", zIndex: 0 }}
                            zoomControl={false}
                            attributionControl={false}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={driverPosition}>
                              <Popup>📍 Votre position</Popup>
                            </Marker>
                            {delivery.pickup_lat && delivery.pickup_lng && (
                              <Marker position={[delivery.pickup_lat, delivery.pickup_lng]}>
                                <Popup>🟢 Récupération: {delivery.pickup_address || "Point de collecte"}</Popup>
                              </Marker>
                            )}
                            <Marker position={[delivery.dropoff_lat, delivery.dropoff_lng]}>
                              <Popup>🔴 Livraison: {delivery.dropoff_address || "Point de livraison"}</Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      )}

                      {/* Distance & ETA info */}
                      <div className="flex items-center gap-3 text-xs bg-muted/50 rounded-lg p-2">
                        {delivery.distance_km && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            {delivery.distance_km.toFixed(1)} km
                          </span>
                        )}
                        {delivery.estimated_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-orange-500" />
                            ~{delivery.estimated_minutes} min
                          </span>
                        )}
                        <span className="ml-auto font-bold text-green-600">
                          {delivery.driver_fee?.toLocaleString() || 0} FCFA
                        </span>
                      </div>

                      {/* GPS Navigation buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        {delivery.status === "accepted" && delivery.pickup_lat && delivery.pickup_lng && (
                          <Button variant="outline" size="sm" className="text-xs gap-1"
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${driverPosition[0]},${driverPosition[1]}&destination=${delivery.pickup_lat},${delivery.pickup_lng}&travelmode=driving`, "_blank")}>
                            <Navigation className="w-3.5 h-3.5" /> Itinéraire fournisseur
                          </Button>
                        )}
                        {(delivery.status === "picked_up" || delivery.status === "in_transit") && delivery.dropoff_lat && delivery.dropoff_lng && (
                          <Button variant="outline" size="sm" className="text-xs gap-1"
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${driverPosition[0]},${driverPosition[1]}&destination=${delivery.dropoff_lat},${delivery.dropoff_lng}&travelmode=driving`, "_blank")}>
                            <Navigation className="w-3.5 h-3.5" /> Itinéraire acheteur
                          </Button>
                        )}
                        {delivery.pickup_lat && delivery.pickup_lng && delivery.dropoff_lat && delivery.dropoff_lng && (
                          <Button variant="outline" size="sm" className="text-xs gap-1"
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${driverPosition[0]},${driverPosition[1]}&waypoints=${delivery.pickup_lat},${delivery.pickup_lng}&destination=${delivery.dropoff_lat},${delivery.dropoff_lng}&travelmode=driving`, "_blank")}>
                            <MapPin className="w-3.5 h-3.5" /> Itinéraire complet
                          </Button>
                        )}
                      </div>

                      {/* Earnings details */}
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-2.5 space-y-1">
                        <p className="text-[10px] font-semibold text-green-800 dark:text-green-300">💰 Détails des gains</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Frais de livraison total</span>
                          <span className="font-medium">{delivery.delivery_fee?.toLocaleString() || 0} FCFA</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Commission plateforme</span>
                          <span className="font-medium text-red-600">-{delivery.platform_fee?.toLocaleString() || 0} FCFA</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold border-t border-green-200 dark:border-green-800 pt-1">
                          <span className="text-green-700 dark:text-green-400">Votre gain</span>
                          <span className="text-green-700 dark:text-green-400">{delivery.driver_fee?.toLocaleString() || 0} FCFA</span>
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex gap-2">
                        {delivery.status === "accepted" && (
                          <Button variant="hero" size="sm" className="flex-1"
                            onClick={() => updateDeliveryStatus(delivery.id, "picked_up")}>
                            <Package className="w-4 h-4 mr-1" /> J'ai récupéré la commande
                          </Button>
                        )}
                        {delivery.status === "picked_up" && (
                          <Button variant="hero" size="sm" className="flex-1"
                            onClick={() => updateDeliveryStatus(delivery.id, "in_transit")}>
                            <Navigation className="w-4 h-4 mr-1" /> Je suis en route
                          </Button>
                        )}
                        {delivery.status === "in_transit" && (
                          <Button variant="hero" size="sm" className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => updateDeliveryStatus(delivery.id, "delivered")}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> ✅ Marquer comme livré
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

          {/* Wallet / Earnings */}
          <TabsContent value="wallet" className="space-y-4 mt-3">
            {/* Balance card */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
                  <p className="text-3xl font-bold text-primary">{availableBalance.toLocaleString()} FCFA</p>
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Total gagné: {totalEarnings.toLocaleString()} F</span>
                    <span>Retiré: {totalWithdrawn.toLocaleString()} F</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal form */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-primary" />
                  Demander un retrait
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Montant (FCFA)</Label>
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`Max: ${availableBalance.toLocaleString()}`}
                    max={availableBalance}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Opérateur</Label>
                  <Select value={withdrawOperator} onValueChange={setWithdrawOperator}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flooz">Moov Money / Flooz</SelectItem>
                      <SelectItem value="tmoney">T-Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Numéro de téléphone</Label>
                  <Input
                    type="tel"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    placeholder="+228 XX XX XX XX"
                  />
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleWithdrawal}
                  disabled={isWithdrawing || availableBalance <= 0}
                >
                  {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
                  Demander le retrait
                </Button>
              </CardContent>
            </Card>

            {/* Withdrawal history */}
            {withdrawals.length > 0 && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historique des retraits
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  {withdrawals.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{w.amount.toLocaleString()} FCFA</p>
                        <p className="text-[10px] text-muted-foreground">
                          {w.operator === "flooz" ? "Moov" : "T-Money"} • {w.phone_number}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(w.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <Badge className={
                        w.status === "completed" ? "bg-green-100 text-green-800" :
                        w.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {w.status === "completed" ? "Effectué" : w.status === "pending" ? "En attente" : "Refusé"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
