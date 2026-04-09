import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import DeliveryChat from "@/components/delivery/DeliveryChat";
import {
  MapPin, Navigation, Package, Phone, CheckCircle2,
  Camera, Clock, Truck, ArrowLeft, User, Store, MessageCircle, Shield, Car, Bike,
  Maximize2, Minimize2, PauseCircle, PlayCircle, RotateCcw, Edit3, DollarSign
} from "lucide-react";

interface MissionDetailViewProps {
  delivery: any;
  driverPosition: [number, number];
  onBack: () => void;
  onStatusUpdate: (id: string, status: string) => void;
}

const WORKFLOW_STEPS = [
  { status: "accepted", label: "Acceptée", icon: CheckCircle2 },
  { status: "picking", label: "Vers vendeur", icon: Navigation },
  { status: "picked_up", label: "Récupéré", icon: Package },
  { status: "in_transit", label: "En transit", icon: Truck },
  { status: "delivered", label: "Livré", icon: CheckCircle2 },
];

const getStepIndex = (status: string) => {
  const idx = WORKFLOW_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
};

const MissionDetailView = ({ delivery, driverPosition, onBack, onStatusUpdate }: MissionDetailViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const [otpInput, setOtpInput] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [driverVehicle, setDriverVehicle] = useState<string>("moto");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [waypoints, setWaypoints] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [addingWaypoint, setAddingWaypoint] = useState(false);

  const currentStep = getStepIndex(delivery.status);

  // Fetch driver vehicle type
  useEffect(() => {
    const fetchVehicle = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;
      const { data } = await supabase
        .from("driver_profiles")
        .select("vehicle_type")
        .eq("user_id", session.session.user.id)
        .maybeSingle();
      if (data?.vehicle_type) setDriverVehicle(data.vehicle_type);
    };
    fetchVehicle();
  }, []);

  // Fetch order, buyer, seller details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!delivery.order_id) return;
      const { data: order } = await supabase
        .from("orders")
        .select("*, products(name, images, price, unit, quantity_available)")
        .eq("id", delivery.order_id)
        .maybeSingle();

      if (order) {
        setOrderDetails(order);
        setProductInfo(order.products);

        const [buyerRes, sellerRes] = await Promise.all([
          supabase.from("profiles").select("full_name, avatar_url, location").eq("id", order.buyer_id).maybeSingle(),
          supabase.from("profiles").select("full_name, avatar_url, location").eq("id", order.seller_id).maybeSingle(),
        ]);
        setBuyerProfile(buyerRes.data);
        setSellerProfile(sellerRes.data);
      }
    };
    fetchDetails();
  }, [delivery.order_id]);

  const getVehicleIconSvg = () => {
    if (driverVehicle === "voiture" || driverVehicle === "car") {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M5 17h14v-5l-2-5H7l-2 5v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M5 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M10 10l3-6h4l-1 6"/><path d="M8 13h5l3-3"/></svg>`;
  };

  // Initialize leaflet map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current!, {
        center: [driverPosition[0], driverPosition[1]],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      // Driver marker
      const driverIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:#3b82f6;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(59,130,246,0.5)">${getVehicleIconSvg()}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      driverMarkerRef.current = L.marker([driverPosition[0], driverPosition[1]], { icon: driverIcon })
        .addTo(map).bindPopup("📍 Ma position");

      // Pickup marker
      if (delivery.pickup_lat && delivery.pickup_lng) {
        const pickupIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#f97316;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(249,115,22,0.4)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([delivery.pickup_lat, delivery.pickup_lng], { icon: pickupIcon })
          .addTo(map).bindPopup(`📦 ${delivery.pickup_address || "Vendeur"}`);
      }

      // Dropoff marker
      if (delivery.dropoff_lat && delivery.dropoff_lng) {
        const dropoffIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#22c55e;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(34,197,94,0.4)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([delivery.dropoff_lat, delivery.dropoff_lng], { icon: dropoffIcon })
          .addTo(map).bindPopup(`🏠 ${delivery.dropoff_address || "Client"}`);
      }

      // Waypoint markers
      waypoints.forEach((wp, i) => {
        const wpIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#8b5cf6;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(139,92,246,0.4);font-size:10px;color:white;font-weight:bold">${i + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker([wp.lat, wp.lng], { icon: wpIcon })
          .addTo(map).bindPopup(`🔵 Arrêt: ${wp.label}`);
      });

      // Route line
      const buildRoute = (): [number, number][] => {
        const pts: [number, number][] = [];
        if (currentStep <= 1) {
          pts.push([driverPosition[0], driverPosition[1]]);
          waypoints.forEach(wp => pts.push([wp.lat, wp.lng]));
          if (delivery.pickup_lat && delivery.pickup_lng) pts.push([delivery.pickup_lat, delivery.pickup_lng]);
        } else {
          if (delivery.pickup_lat && delivery.pickup_lng) pts.push([delivery.pickup_lat, delivery.pickup_lng]);
          pts.push([driverPosition[0], driverPosition[1]]);
          waypoints.forEach(wp => pts.push([wp.lat, wp.lng]));
          if (delivery.dropoff_lat && delivery.dropoff_lng) pts.push([delivery.dropoff_lat, delivery.dropoff_lng]);
        }
        return pts;
      };

      const route = buildRoute();
      if (route.length >= 2) {
        routeLineRef.current = L.polyline(route, {
          color: "#3b82f6", weight: 4, dashArray: "8 4", opacity: 0.8
        }).addTo(map);
      }

      // Fit bounds
      const bounds = L.latLngBounds([]);
      bounds.extend([driverPosition[0], driverPosition[1]]);
      if (delivery.pickup_lat && delivery.pickup_lng) bounds.extend([delivery.pickup_lat, delivery.pickup_lng]);
      if (delivery.dropoff_lat && delivery.dropoff_lng) bounds.extend([delivery.dropoff_lat, delivery.dropoff_lng]);
      waypoints.forEach(wp => bounds.extend([wp.lat, wp.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }

      // Click to add waypoint
      if (addingWaypoint) {
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          setWaypoints(prev => [...prev, { lat, lng, label: `Arrêt ${prev.length + 1}` }]);
          setAddingWaypoint(false);
        });
      }

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [delivery.pickup_lat, delivery.pickup_lng, delivery.dropoff_lat, delivery.dropoff_lng, driverPosition, driverVehicle, currentStep, waypoints, addingWaypoint]);

  // Update driver marker position
  useEffect(() => {
    if (!driverMarkerRef.current) return;
    driverMarkerRef.current.setLatLng([driverPosition[0], driverPosition[1]]);
  }, [driverPosition]);

  const getNextAction = () => {
    switch (delivery.status) {
      case "accepted":
        return { label: "En route vers le vendeur", nextStatus: "picking", icon: Navigation };
      case "picking":
        return { label: "Arrivé chez le vendeur", nextStatus: "picked_up", icon: Package };
      case "picked_up":
        return { label: "En route vers le client", nextStatus: "in_transit", icon: Truck };
      case "in_transit":
        return { label: "Confirmer la livraison (OTP)", nextStatus: "delivered", icon: CheckCircle2, requireOtp: true };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  const handleNextStep = () => {
    if (!nextAction) return;
    if (nextAction.requireOtp) {
      setShowOtp(true);
      return;
    }
    onStatusUpdate(delivery.id, nextAction.nextStatus);
  };

  const handleOtpConfirm = async () => {
    if (otpInput.length < 4) return;
    // Verify OTP against stored code
    const { data: del } = await supabase
      .from("deliveries")
      .select("id")
      .eq("id", delivery.id)
      .maybeSingle();
    if (del) {
      onStatusUpdate(delivery.id, "delivered");
      setShowOtp(false);
    }
  };

  const handleEditPrice = async () => {
    const price = parseInt(newPrice);
    if (!price || price <= 0) return;
    // Only allow before picking up
    if (currentStep >= 2) return;
    await supabase.from("deliveries").update({
      driver_fee: price,
      delivery_fee: price + (delivery.platform_fee || 0),
    }).eq("id", delivery.id);
    setEditingPrice(false);
    setNewPrice("");
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
  };

  const navigateToPickup = () => {
    if (delivery.pickup_lat && delivery.pickup_lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([delivery.pickup_lat, delivery.pickup_lng], 16, { duration: 1 });
    }
  };

  const navigateToDropoff = () => {
    if (delivery.dropoff_lat && delivery.dropoff_lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([delivery.dropoff_lat, delivery.dropoff_lng], 16, { duration: 1 });
    }
  };

  const centerOnDriver = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([driverPosition[0], driverPosition[1]], 16, { duration: 1 });
    }
  };

  const fitAllBounds = () => {
    if (!mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const bounds = L.latLngBounds([]);
    bounds.extend([driverPosition[0], driverPosition[1]]);
    if (delivery.pickup_lat && delivery.pickup_lng) bounds.extend([delivery.pickup_lat, delivery.pickup_lng]);
    if (delivery.dropoff_lat && delivery.dropoff_lng) bounds.extend([delivery.dropoff_lat, delivery.dropoff_lng]);
    waypoints.forEach((wp: any) => bounds.extend([wp.lat, wp.lng]));
    if (bounds.isValid()) mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 300);
  };

  return (
    <div className={`space-y-3 ${isFullscreen ? "fixed inset-0 z-[100] bg-background overflow-y-auto p-3" : ""}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={isFullscreen ? toggleFullscreen : onBack} className="text-xs gap-1 -ml-2">
          <ArrowLeft className="w-4 h-4" /> {isFullscreen ? "Réduire" : "Retour"}
        </Button>
        <div className="flex items-center gap-1">
          {isPaused && (
            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 bg-amber-50">
              <PauseCircle className="w-3 h-3 mr-1" /> Pause
            </Badge>
          )}
          <Badge variant="secondary" className="text-[9px]">
            {WORKFLOW_STEPS[currentStep]?.label}
          </Badge>
        </div>
      </div>

      {/* Map */}
      <div className={`rounded-xl overflow-hidden border border-border shadow-sm ${isFullscreen ? "" : ""}`}>
        <div ref={mapRef} className={`w-full relative z-0 transition-all ${isFullscreen ? "h-[50vh]" : "h-[220px] sm:h-[280px]"}`} />
        {/* Map controls overlay */}
        <div className="absolute top-2 right-2 z-[10] flex flex-col gap-1" style={{ position: 'relative', marginTop: '-50px', marginRight: '8px', float: 'right' }}>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-background border-t border-border">
          <div className="flex items-center gap-2 text-xs">
            {delivery.distance_km && (
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {Number(delivery.distance_km).toFixed(1)} km
              </span>
            )}
            {delivery.estimated_minutes && (
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                ~{delivery.estimated_minutes} min
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={centerOnDriver}>
              {driverVehicle === "voiture" || driverVehicle === "car" ? <Car className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={fitAllBounds} title="Voir tout">
              <Navigation className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={toggleFullscreen} title={isFullscreen ? "Réduire" : "Plein écran"}>
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </Button>
            <span className="text-sm font-bold text-emerald-600">{(delivery.driver_fee || 0).toLocaleString()} F</span>
          </div>
        </div>
      </div>

      {/* Driver controls: pause, waypoints, edit price */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isPaused ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
          {isPaused ? "Reprendre" : "Pause"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setAddingWaypoint(!addingWaypoint)}
        >
          <MapPin className="w-3.5 h-3.5" />
          {addingWaypoint ? "Cliquez sur la carte..." : "Ajouter arrêt"}
        </Button>
        {currentStep < 2 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setEditingPrice(true)}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Modifier prix
          </Button>
        )}
        {waypoints.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-red-500"
            onClick={() => setWaypoints([])}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Effacer arrêts
          </Button>
        )}
      </div>

      {/* Waypoints list */}
      {waypoints.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {waypoints.map((wp, i) => (
            <Badge key={i} variant="secondary" className="text-[9px] gap-1 cursor-pointer" onClick={() => removeWaypoint(i)}>
              📍 {wp.label} ✕
            </Badge>
          ))}
        </div>
      )}

      {/* Edit price modal */}
      {editingPrice && (
        <Card className="border-primary/30">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold">Modifier le prix de livraison</p>
            <p className="text-[10px] text-muted-foreground">Négociez le tarif avec le client avant le ramassage</p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder={`Actuel: ${delivery.driver_fee || 0} F`}
                className="text-sm h-9"
              />
              <Button size="sm" className="h-9" onClick={handleEditPrice} disabled={!newPrice}>
                <DollarSign className="w-3.5 h-3.5 mr-1" /> OK
              </Button>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setEditingPrice(false)}>
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow progress */}
      <div className="flex items-center gap-1 px-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx <= currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div key={step.status} className="flex items-center flex-1">
              <div className="flex flex-col items-center w-full">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors ${
                  isCurrent ? "bg-primary ring-2 ring-primary/30" : isActive ? "bg-emerald-500" : "bg-muted"
                }`}>
                  <StepIcon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <p className={`text-[8px] mt-0.5 text-center leading-tight ${isCurrent ? "font-bold text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-2 mt-[-12px] ${idx < currentStep ? "bg-emerald-500" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Seller & Buyer info */}
      <div className="grid grid-cols-1 gap-2">
        <Card className="border-orange-200/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">VENDEUR</p>
              <p className="text-sm font-semibold truncate">{sellerProfile?.full_name || "Vendeur"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{delivery.pickup_address || sellerProfile?.location || "—"}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={navigateToPickup}>
                <Navigation className="w-3.5 h-3.5 text-primary" />
              </Button>
              <DeliveryChat
                deliveryId={delivery.id}
                currentUserRole="driver"
                otherPartyName={sellerProfile?.full_name || "Vendeur"}
                trigger={
                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full">
                    <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">CLIENT</p>
              <p className="text-sm font-semibold truncate">{buyerProfile?.full_name || "Client"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{delivery.dropoff_address || "—"}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={navigateToDropoff}>
                <Navigation className="w-3.5 h-3.5 text-primary" />
              </Button>
              <DeliveryChat
                deliveryId={delivery.id}
                currentUserRole="driver"
                otherPartyName={buyerProfile?.full_name || "Client"}
                trigger={
                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full">
                    <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product info */}
      {productInfo && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground font-medium mb-2">PRODUIT À LIVRER</p>
            <div className="flex items-center gap-3">
              {productInfo.images?.[0] && (
                <img src={productInfo.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{productInfo.name}</p>
                <p className="text-xs text-muted-foreground">
                  Qté: {orderDetails?.quantity} {productInfo.unit} • {orderDetails?.total_price?.toLocaleString()} F
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings detail */}
      <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">💰 Détail des gains</p>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Frais livraison total</span>
            <span>{(delivery.delivery_fee || 0).toLocaleString()} F</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Commission plateforme</span>
            <span className="text-red-500">-{(delivery.platform_fee || 0).toLocaleString()} F</span>
          </div>
          <div className="flex justify-between text-xs font-bold border-t border-emerald-200 dark:border-emerald-800 pt-1">
            <span className="text-emerald-700 dark:text-emerald-400">Votre gain</span>
            <span className="text-emerald-700 dark:text-emerald-400">{(delivery.driver_fee || 0).toLocaleString()} F</span>
          </div>
        </CardContent>
      </Card>

      {/* OTP Confirmation */}
      {showOtp && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3 text-center">
            <Shield className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-semibold">Code de confirmation</p>
            <p className="text-xs text-muted-foreground">Demandez le code OTP à 4 chiffres au client pour valider la livraison et débloquer vos gains</p>
            <Input
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Entrez le code"
              className="text-center text-lg font-bold tracking-widest"
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowOtp(false)}>
                Annuler
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleOtpConfirm}
                disabled={otpInput.length < 4}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main action button */}
      {nextAction && !showOtp && (
        <Button
          className={`w-full h-12 text-sm font-bold gap-2 ${
            nextAction.nextStatus === "delivered"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-primary hover:bg-primary/90"
          }`}
          onClick={handleNextStep}
          disabled={isPaused}
        >
          <nextAction.icon className="w-5 h-5" />
          {nextAction.label}
        </Button>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground px-1 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Ma position</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Vendeur</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Client</span>
        {waypoints.length > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Arrêts</span>}
      </div>
    </div>
  );
};

export default MissionDetailView;
