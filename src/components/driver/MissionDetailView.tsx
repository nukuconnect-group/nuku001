import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import DeliveryChat from "@/components/delivery/DeliveryChat";
import {
  MapPin, Navigation, Package, CheckCircle2,
  Clock, Truck, ArrowLeft, User, Store, MessageCircle, Shield,
  Locate, Layers, PauseCircle, PlayCircle, RotateCcw, Edit3,
  ChevronUp, ChevronDown, Crosshair, Compass
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const leafletRef = useRef<any>(null);
  const gpsWatchRef = useRef<number | null>(null);

  const [otpInput, setOtpInput] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [driverVehicle, setDriverVehicle] = useState<string>("moto");
  const [isPaused, setIsPaused] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [waypoints, setWaypoints] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [addingWaypoint, setAddingWaypoint] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [livePos, setLivePos] = useState<[number, number]>(driverPosition);
  const [navMode, setNavMode] = useState(true); // mode auto-suivi style Google Maps
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastDbWriteRef = useRef<number>(0);

  const currentStep = getStepIndex(delivery.status);

  // Persist position to DB (throttled to 5s)
  const persistPosition = useCallback(async (lat: number, lng: number) => {
    if (!delivery.id) return;
    const now = Date.now();
    if (now - lastDbWriteRef.current < 5000) return;
    lastDbWriteRef.current = now;
    try {
      await supabase.from("deliveries").update({
        driver_current_lat: lat,
        driver_current_lng: lng,
      }).eq("id", delivery.id);
      // Also update driver_profiles so others see the live location
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id) {
        await supabase.from("driver_profiles")
          .update({ current_lat: lat, current_lng: lng })
          .eq("user_id", session.session.user.id);
      }
    } catch (e) {
      console.warn("[GPS] persist error", e);
    }
  }, [delivery.id]);

  // Real GPS tracking — watchPosition + interval fallback for reliability
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non supportée par ce navigateur");
      return;
    }

    const onPos = (pos: GeolocationPosition) => {
      const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setLivePos(newPos);
      setGpsAccuracy(pos.coords.accuracy);
      setGpsError(null);
      persistPosition(newPos[0], newPos[1]);
    };

    const onErr = (err: GeolocationPositionError) => {
      console.warn("[GPS]", err.code, err.message);
      if (err.code === 1) setGpsError("Autorisez l'accès à votre position pour suivre la livraison");
      else if (err.code === 2) setGpsError("Position GPS indisponible. Activez le GPS.");
      else if (err.code === 3) setGpsError("Délai GPS dépassé. Réessai…");
    };

    // 1. Continuous watch (fires when position changes)
    gpsWatchRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 20000,
    });

    // 2. Periodic fallback every 5s — ensures the marker keeps moving even
    //    if watchPosition is throttled by the browser (common on desktop / when stationary)
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(onPos, onErr, {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      });
    }, 5000);

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
      clearInterval(interval);
    };
  }, [delivery.id, persistPosition]);

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

  // Build route points
  const buildRoutePoints = useCallback((): [number, number][] => {
    const pts: [number, number][] = [];
    if (currentStep <= 1) {
      pts.push([livePos[0], livePos[1]]);
      waypoints.forEach(wp => pts.push([wp.lat, wp.lng]));
      if (delivery.pickup_lat && delivery.pickup_lng) pts.push([delivery.pickup_lat, delivery.pickup_lng]);
    } else {
      if (delivery.pickup_lat && delivery.pickup_lng) pts.push([delivery.pickup_lat, delivery.pickup_lng]);
      pts.push([livePos[0], livePos[1]]);
      waypoints.forEach(wp => pts.push([wp.lat, wp.lng]));
      if (delivery.dropoff_lat && delivery.dropoff_lng) pts.push([delivery.dropoff_lat, delivery.dropoff_lng]);
    }
    return pts;
  }, [currentStep, livePos, waypoints, delivery]);

  // Fetch OSRM route
  const fetchOSRMRoute = useCallback(async (points: [number, number][]) => {
    if (points.length < 2) return null;
    const coords = points.map(p => `${p[1]},${p[0]}`).join(";");
    try {
      const resp = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.code !== "Ok" || !data.routes?.[0]) return null;
      return data.routes[0];
    } catch {
      return null;
    }
  }, []);

  // Initialize leaflet map
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      leafletRef.current = L;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [livePos[0], livePos[1]],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Driver marker with pulse
      const driverIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="position:relative">
          <div style="position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(59,130,246,0.15);top:-8px;left:-8px;animation:pulse 2s infinite"></div>
          <div style="background:#3b82f6;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(59,130,246,0.5);position:relative;z-index:2">${getVehicleIconSvg()}</div>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      driverMarkerRef.current = L.marker([livePos[0], livePos[1]], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);

      // Pickup marker
      if (delivery.pickup_lat && delivery.pickup_lng) {
        const pickupIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="background:#ef4444;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4)">
              <div style="transform:rotate(45deg);color:white;font-size:12px;font-weight:bold">📦</div>
            </div>
          </div>`,
          iconSize: [28, 40],
          iconAnchor: [14, 40],
        });
        L.marker([delivery.pickup_lat, delivery.pickup_lng], { icon: pickupIcon })
          .addTo(map).bindPopup(`<b>📦 Point de collecte</b><br/>${delivery.pickup_address || "Vendeur"}`);
      }

      // Dropoff marker
      if (delivery.dropoff_lat && delivery.dropoff_lng) {
        const dropoffIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="background:#22c55e;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(34,197,94,0.4)">
              <div style="transform:rotate(45deg);color:white;font-size:12px;font-weight:bold">🏠</div>
            </div>
          </div>`,
          iconSize: [28, 40],
          iconAnchor: [14, 40],
        });
        L.marker([delivery.dropoff_lat, delivery.dropoff_lng], { icon: dropoffIcon })
          .addTo(map).bindPopup(`<b>🏠 Point de livraison</b><br/>${delivery.dropoff_address || "Client"}`);
      }

      // Waypoint markers
      waypoints.forEach((wp, i) => {
        const wpIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#8b5cf6;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(139,92,246,0.4);font-size:10px;color:white;font-weight:bold">${i + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map).bindPopup(`🔵 Arrêt: ${wp.label}`);
      });

      // Route
      const routePts = buildRoutePoints();
      const osrmRoute = await fetchOSRMRoute(routePts);
      if (osrmRoute?.geometry?.coordinates) {
        const leafletCoords: [number, number][] = osrmRoute.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        routeLineRef.current = L.polyline(leafletCoords, {
          color: "#3b82f6", weight: 5, opacity: 0.85,
        }).addTo(map);

        const distKm = (osrmRoute.distance / 1000).toFixed(1);
        const durMin = Math.round(osrmRoute.duration / 60);
        setRouteInfo({ distance: `${distKm} km`, duration: `${durMin} min` });

        // Extract turn-by-turn steps
        const steps = osrmRoute.legs?.flatMap((leg: any) =>
          leg.steps?.map((s: any) => ({
            instruction: s.maneuver?.type === "depart" ? "Départ" :
              s.maneuver?.type === "arrive" ? "Arrivée" :
              s.maneuver?.modifier ? `Tournez ${s.maneuver.modifier === "left" ? "à gauche" : s.maneuver.modifier === "right" ? "à droite" : s.maneuver.modifier}` :
              s.maneuver?.type || "Continuer",
            distance: s.distance ? `${(s.distance / 1000).toFixed(1)} km` : "",
            name: s.name || "",
          }))
        ) || [];
        setRouteSteps(steps.filter((s: any) => s.distance));
      } else if (routePts.length >= 2) {
        routeLineRef.current = L.polyline(routePts, {
          color: "#3b82f6", weight: 4, dashArray: "8 4", opacity: 0.8,
        }).addTo(map);
      }

      // Fit bounds
      const bounds = L.latLngBounds([]);
      bounds.extend([livePos[0], livePos[1]]);
      if (delivery.pickup_lat && delivery.pickup_lng) bounds.extend([delivery.pickup_lat, delivery.pickup_lng]);
      if (delivery.dropoff_lat && delivery.dropoff_lng) bounds.extend([delivery.dropoff_lat, delivery.dropoff_lng]);
      waypoints.forEach(wp => bounds.extend([wp.lat, wp.lng]));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });

      // Click to add waypoint
      if (addingWaypoint) {
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          setWaypoints(prev => [...prev, { lat, lng, label: `Arrêt ${prev.length + 1}` }]);
          setAddingWaypoint(false);
        });
      }

      mapInstanceRef.current = map;

      // Pulse CSS
      if (!document.getElementById("map-pulse-css")) {
        const style = document.createElement("style");
        style.id = "map-pulse-css";
        style.textContent = `@keyframes pulse{0%{transform:scale(1);opacity:0.6}50%{transform:scale(1.4);opacity:0.2}100%{transform:scale(1);opacity:0.6}}`;
        document.head.appendChild(style);
      }

      // Force map to recalculate size after render
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [delivery.pickup_lat, delivery.pickup_lng, delivery.dropoff_lat, delivery.dropoff_lng, driverVehicle, currentStep, waypoints, addingWaypoint]);

  // Update driver marker position in real time + auto-pan in nav mode
  useEffect(() => {
    if (!driverMarkerRef.current) return;
    driverMarkerRef.current.setLatLng([livePos[0], livePos[1]]);
    if (navMode && mapInstanceRef.current) {
      // Smoothly pan the map to follow the driver (Google Maps style)
      mapInstanceRef.current.panTo([livePos[0], livePos[1]], { animate: true, duration: 0.8 });
    }
  }, [livePos, navMode]);

  // Refresh route periodically when moving
  useEffect(() => {
    if (isPaused || delivery.status === "delivered") return;
    const interval = setInterval(async () => {
      if (!mapInstanceRef.current || !leafletRef.current) return;
      const routePts = buildRoutePoints();
      const osrmRoute = await fetchOSRMRoute(routePts);
      if (osrmRoute?.geometry?.coordinates) {
        const L = leafletRef.current;
        if (routeLineRef.current) {
          mapInstanceRef.current.removeLayer(routeLineRef.current);
        }
        const leafletCoords: [number, number][] = osrmRoute.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        routeLineRef.current = L.polyline(leafletCoords, {
          color: "#3b82f6", weight: 5, opacity: 0.85,
        }).addTo(mapInstanceRef.current);

        const distKm = (osrmRoute.distance / 1000).toFixed(1);
        const durMin = Math.round(osrmRoute.duration / 60);
        setRouteInfo({ distance: `${distKm} km`, duration: `${durMin} min` });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isPaused, delivery.status, buildRoutePoints, fetchOSRMRoute]);

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

  const centerOnDriver = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([livePos[0], livePos[1]], 16, { duration: 1 });
    }
  };

  const fitAllBounds = () => {
    if (!mapInstanceRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const bounds = L.latLngBounds([]);
    bounds.extend([livePos[0], livePos[1]]);
    if (delivery.pickup_lat && delivery.pickup_lng) bounds.extend([delivery.pickup_lat, delivery.pickup_lng]);
    if (delivery.dropoff_lat && delivery.dropoff_lng) bounds.extend([delivery.dropoff_lat, delivery.dropoff_lng]);
    waypoints.forEach((wp: any) => bounds.extend([wp.lat, wp.lng]));
    if (bounds.isValid()) mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Map takes full screen */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapRef} className="absolute inset-0 z-0" style={{ width: "100%", height: "100%" }} />

        {/* Top bar overlay */}
        <div className="absolute top-0 left-0 right-0 z-[10] p-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            className="w-10 h-10 rounded-full bg-background/90 backdrop-blur shadow-md border-0"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {isPaused && (
              <Badge className="bg-amber-500 text-white text-[10px] shadow">
                <PauseCircle className="w-3 h-3 mr-1" /> Pause
              </Badge>
            )}
            <Badge className="bg-background/90 backdrop-blur text-foreground text-[10px] shadow border-0">
              {WORKFLOW_STEPS[currentStep]?.label}
            </Badge>
          </div>
        </div>

        {/* Map control buttons */}
        <div className="absolute right-3 bottom-4 z-[10] flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            className={`w-11 h-11 rounded-full backdrop-blur shadow-md border-0 ${navMode ? "bg-primary text-primary-foreground" : "bg-background/90"}`}
            onClick={() => {
              setNavMode((v) => {
                const next = !v;
                if (next && mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([livePos[0], livePos[1]], 17, { duration: 0.8 });
                }
                toast({ title: next ? "Mode navigation activé" : "Mode navigation désactivé", description: next ? "La carte suit votre position" : "Vue libre" });
                return next;
              });
            }}
            title={navMode ? "Désactiver le suivi auto" : "Activer le suivi auto"}
          >
            <Compass className={`w-5 h-5 ${navMode ? "" : "text-primary"}`} />
          </Button>
          <Button variant="outline" size="icon" className="w-10 h-10 rounded-full bg-background/90 backdrop-blur shadow-md border-0" onClick={centerOnDriver} title="Ma position">
            <Locate className="w-5 h-5 text-primary" />
          </Button>
          <Button variant="outline" size="icon" className="w-10 h-10 rounded-full bg-background/90 backdrop-blur shadow-md border-0" onClick={() => { setNavMode(false); fitAllBounds(); }} title="Voir tout">
            <Layers className="w-5 h-5" />
          </Button>
        </div>

        {/* GPS status banner */}
        {gpsError && (
          <div className="absolute top-16 left-3 right-3 z-[11] bg-amber-500/95 text-white text-[11px] font-medium rounded-xl px-3 py-2 shadow-md flex items-center gap-2">
            <Crosshair className="w-4 h-4 flex-shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}
        {!gpsError && gpsAccuracy != null && (
          <div className="absolute bottom-4 left-3 z-[10] bg-background/90 backdrop-blur rounded-full px-3 py-1 shadow-md text-[10px] font-medium flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${gpsAccuracy < 20 ? "bg-emerald-500" : gpsAccuracy < 50 ? "bg-amber-500" : "bg-red-500"} animate-pulse`} />
            GPS ±{Math.round(gpsAccuracy)}m
          </div>
        )}

        {/* Route info pill */}
        {routeInfo && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[10]">
            <div className="bg-background/90 backdrop-blur rounded-full px-4 py-1.5 shadow-md flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />{routeInfo.distance}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-orange-500" />{routeInfo.duration}</span>
            </div>
          </div>
        )}

        {/* Next turn instruction pill */}
        {routeSteps.length > 0 && (
          <div className="absolute top-[6.5rem] left-1/2 -translate-x-1/2 z-[10] max-w-[90vw]">
            <div className="bg-primary text-primary-foreground rounded-xl px-3 py-2 shadow-lg text-xs font-medium flex items-center gap-2">
              <Navigation className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="truncate">{routeSteps[0].instruction}{routeSteps[0].name ? ` — ${routeSteps[0].name}` : ""}</p>
                <p className="text-[10px] opacity-75">{routeSteps[0].distance}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom sliding panel */}
      <div className={`bg-background rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ${panelExpanded ? "max-h-[55vh]" : "max-h-[180px]"} overflow-hidden flex-shrink-0`}>
        <button className="w-full flex justify-center py-2 cursor-grab" onClick={() => setPanelExpanded(!panelExpanded)}>
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </button>

        <div className="overflow-y-auto px-4 pb-4 space-y-3" style={{ maxHeight: panelExpanded ? "calc(55vh - 40px)" : "140px" }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">
                {currentStep <= 1 ? "En route vers le vendeur" :
                 currentStep === 2 ? "Colis récupéré" :
                 currentStep === 3 ? "En route vers le client" : "Livraison terminée"}
              </p>
              <p className="text-xs text-muted-foreground">
                {routeInfo ? `${routeInfo.duration} • ${routeInfo.distance}` : `~${delivery.estimated_minutes || 30} min`}
              </p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-sm border-0">
              {(delivery.driver_fee || 0).toLocaleString("en-US")} F
            </Badge>
          </div>

          {/* Seller & Buyer */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {sellerProfile?.avatar_url ? (
                <img src={sellerProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <Store className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Vendeur</p>
              <p className="text-sm font-semibold truncate">{sellerProfile?.full_name || "Vendeur"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{delivery.pickup_address || sellerProfile?.location || "—"}</p>
            </div>
            <DeliveryChat deliveryId={delivery.id} currentUserRole="driver" otherPartyName={sellerProfile?.full_name || "Vendeur"}
              trigger={<Button variant="outline" size="icon" className="w-9 h-9 rounded-full border-primary/20"><MessageCircle className="w-4 h-4 text-primary" /></Button>} />
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {buyerProfile?.avatar_url ? (
                <img src={buyerProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <User className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-semibold truncate">{buyerProfile?.full_name || "Client"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{delivery.dropoff_address || "—"}</p>
            </div>
            <DeliveryChat deliveryId={delivery.id} currentUserRole="driver" otherPartyName={buyerProfile?.full_name || "Client"}
              trigger={<Button variant="outline" size="icon" className="w-9 h-9 rounded-full border-primary/20"><MessageCircle className="w-4 h-4 text-primary" /></Button>} />
          </div>

          {/* Workflow steps */}
          <div className="flex items-center gap-0.5 px-1">
            {WORKFLOW_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
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

          {/* Controls */}
          <div className="flex flex-wrap gap-1.5">
            <Button variant={isPaused ? "default" : "outline"} size="sm" className="h-8 text-[10px] gap-1 rounded-full" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              {isPaused ? "Reprendre" : "Pause"}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 rounded-full" onClick={() => setAddingWaypoint(!addingWaypoint)}>
              <MapPin className="w-3.5 h-3.5" />
              {addingWaypoint ? "Cliquez carte..." : "Arrêt"}
            </Button>
            {currentStep < 2 && (
              <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 rounded-full" onClick={() => setEditingPrice(true)}>
                <Edit3 className="w-3.5 h-3.5" /> Prix
              </Button>
            )}
            {waypoints.length > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-[10px] gap-1 text-red-500 rounded-full" onClick={() => setWaypoints([])}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Waypoints badges */}
          {waypoints.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {waypoints.map((wp, i) => (
                <Badge key={i} variant="secondary" className="text-[9px] gap-1 cursor-pointer" onClick={() => removeWaypoint(i)}>
                  📍 {wp.label} ✕
                </Badge>
              ))}
            </div>
          )}

          {/* Edit price */}
          {editingPrice && (
            <div className="p-3 rounded-xl bg-muted/50 space-y-2">
              <p className="text-xs font-semibold">Modifier le prix de livraison</p>
              <div className="flex gap-2">
                <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={`${delivery.driver_fee || 0} F`} className="text-sm h-9" />
                <Button size="sm" className="h-9" onClick={handleEditPrice} disabled={!newPrice}>OK</Button>
                <Button variant="ghost" size="sm" className="h-9" onClick={() => setEditingPrice(false)}>✕</Button>
              </div>
            </div>
          )}

          {/* Product info */}
          {productInfo && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              {productInfo.images?.[0] && (
                <img src={productInfo.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{productInfo.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  Qté: {orderDetails?.quantity} {productInfo.unit} • {orderDetails?.total_price?.toLocaleString("en-US")} F
                </p>
              </div>
            </div>
          )}

          {/* OTP */}
          {showOtp && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 text-center">
              <Shield className="w-8 h-8 mx-auto text-primary" />
              <p className="text-sm font-semibold">Code de confirmation</p>
              <p className="text-xs text-muted-foreground">Demandez le code OTP au client</p>
              <Input
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Code OTP"
                className="text-center text-lg font-bold tracking-widest"
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowOtp(false)}>Annuler</Button>
                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleOtpConfirm} disabled={otpInput.length < 4}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmer
                </Button>
              </div>
            </div>
          )}

          {/* Main action */}
          {nextAction && !showOtp && (
            <Button
              className={`w-full h-12 text-sm font-bold gap-2 rounded-xl ${
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
        </div>
      </div>
    </div>
  );
};

export default MissionDetailView;
