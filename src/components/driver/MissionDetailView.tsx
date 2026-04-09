import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import DeliveryChat from "@/components/delivery/DeliveryChat";
import {
  MapPin, Navigation, Package, Phone, CheckCircle2,
  Camera, Clock, Truck, ArrowLeft, User, Store, MessageCircle, Shield, Car, Bike
} from "lucide-react";

interface MissionDetailViewProps {
  delivery: any;
  driverPosition: [number, number];
  onBack: () => void;
  onStatusUpdate: (id: string, status: string) => void;
}

const WORKFLOW_STEPS = [
  { status: "accepted", label: "Mission acceptée", icon: CheckCircle2 },
  { status: "picking", label: "En route vers vendeur", icon: Navigation },
  { status: "picked_up", label: "Produit récupéré", icon: Package },
  { status: "in_transit", label: "En route vers client", icon: Truck },
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
  const [otpInput, setOtpInput] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [driverVehicle, setDriverVehicle] = useState<string>("moto");

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

        const { data: buyer } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, location")
          .eq("id", order.buyer_id)
          .maybeSingle();
        setBuyerProfile(buyer);

        const { data: seller } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, location")
          .eq("id", order.seller_id)
          .maybeSingle();
        setSellerProfile(seller);
      }
    };
    fetchDetails();
  }, [delivery.order_id]);

  // Get vehicle icon SVG for map marker
  const getVehicleIconSvg = () => {
    if (driverVehicle === "voiture" || driverVehicle === "car") {
      // Car icon
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M5 17h14v-5l-2-5H7l-2 5v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>`;
    }
    // Motorcycle/moto icon (default)
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

      const centerLat = driverPosition[0];
      const centerLng = driverPosition[1];

      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

      // Driver marker with vehicle icon
      const driverIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:#3b82f6;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(59,130,246,0.5)">
          ${getVehicleIconSvg()}
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      driverMarkerRef.current = L.marker([driverPosition[0], driverPosition[1]], { icon: driverIcon })
        .addTo(map)
        .bindPopup("📍 Ma position");

      // Pickup marker
      if (delivery.pickup_lat && delivery.pickup_lng) {
        const pickupIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#f97316;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(249,115,22,0.4)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([delivery.pickup_lat, delivery.pickup_lng], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`📦 ${delivery.pickup_address || "Vendeur"}`);
      }

      // Dropoff marker
      if (delivery.dropoff_lat && delivery.dropoff_lng) {
        const dropoffIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#22c55e;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(34,197,94,0.4)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([delivery.dropoff_lat, delivery.dropoff_lng], { icon: dropoffIcon })
          .addTo(map)
          .bindPopup(`🏠 ${delivery.dropoff_address || "Client"}`);
      }

      // Draw route line - order depends on current step
      const routePoints: [number, number][] = [];
      if (delivery.pickup_lat && delivery.pickup_lng) routePoints.push([delivery.pickup_lat, delivery.pickup_lng]);
      routePoints.push([driverPosition[0], driverPosition[1]]);
      if (delivery.dropoff_lat && delivery.dropoff_lng) routePoints.push([delivery.dropoff_lat, delivery.dropoff_lng]);

      if (routePoints.length >= 2) {
        const ordered: [number, number][] = [];
        // Show route based on delivery step
        if (currentStep <= 1) {
          // Going to pickup: driver -> pickup
          ordered.push([driverPosition[0], driverPosition[1]]);
          if (delivery.pickup_lat && delivery.pickup_lng) ordered.push([delivery.pickup_lat, delivery.pickup_lng]);
        } else {
          // Going to dropoff: driver -> dropoff (or pickup -> driver -> dropoff)
          if (delivery.pickup_lat && delivery.pickup_lng) ordered.push([delivery.pickup_lat, delivery.pickup_lng]);
          ordered.push([driverPosition[0], driverPosition[1]]);
          if (delivery.dropoff_lat && delivery.dropoff_lng) ordered.push([delivery.dropoff_lat, delivery.dropoff_lng]);
        }
        L.polyline(ordered, { color: "#3b82f6", weight: 4, dashArray: "8 4", opacity: 0.8 }).addTo(map);
      }

      // Fit bounds
      const bounds = L.latLngBounds([]);
      bounds.extend([driverPosition[0], driverPosition[1]]);
      if (delivery.pickup_lat && delivery.pickup_lng) bounds.extend([delivery.pickup_lat, delivery.pickup_lng]);
      if (delivery.dropoff_lat && delivery.dropoff_lng) bounds.extend([delivery.dropoff_lat, delivery.dropoff_lng]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
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
  }, [delivery.pickup_lat, delivery.pickup_lng, delivery.dropoff_lat, delivery.dropoff_lng, driverPosition, driverVehicle, currentStep]);

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
        return { label: "Confirmer la livraison", nextStatus: "delivered", icon: CheckCircle2, requireOtp: true };
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

  const handleOtpConfirm = () => {
    if (otpInput.length >= 4) {
      onStatusUpdate(delivery.id, "delivered");
      setShowOtp(false);
    }
  };

  // In-app navigation: center map on destination instead of opening external maps
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

  return (
    <div className="space-y-3">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="text-xs gap-1 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Retour aux missions
      </Button>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
        <div ref={mapRef} className="w-full h-[220px] sm:h-[280px] relative z-0" />
        {/* Floating info over map */}
        <div className="flex items-center justify-between px-3 py-2 bg-background border-t border-border">
          <div className="flex items-center gap-3 text-xs">
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={centerOnDriver}>
              {driverVehicle === "voiture" || driverVehicle === "car" ? (
                <Car className="w-3 h-3" />
              ) : (
                <Bike className="w-3 h-3" />
              )}
              Ma position
            </Button>
            <span className="text-sm font-bold text-emerald-600">{(delivery.driver_fee || 0).toLocaleString()} F</span>
          </div>
        </div>
      </div>

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
        {/* Seller */}
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
              <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={navigateToPickup} title="Voir sur la carte">
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

        {/* Buyer */}
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
              <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={navigateToDropoff} title="Voir sur la carte">
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
            <p className="text-xs text-muted-foreground">Demandez le code OTP au client pour valider la livraison</p>
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
        >
          <nextAction.icon className="w-5 h-5" />
          {nextAction.label}
        </Button>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Ma position</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Vendeur</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Client</span>
      </div>
    </div>
  );
};

export default MissionDetailView;
