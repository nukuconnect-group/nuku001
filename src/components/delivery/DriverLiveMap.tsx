import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Navigation, Clock, CheckCircle2 } from "lucide-react";

interface DriverLiveMapProps {
  delivery: {
    id: string;
    driver_id: string | null;
    status: string;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    dropoff_address: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    pickup_address: string | null;
    driver_current_lat: number | null;
    driver_current_lng: number | null;
    distance_km: number | null;
    estimated_minutes: number | null;
  };
  driverName?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente de livreur", color: "bg-amber-500", icon: Clock },
  accepted: { label: "Livreur en route vers le point de collecte", color: "bg-blue-500", icon: Navigation },
  picked_up: { label: "Commande récupérée, en route vers vous", color: "bg-indigo-500", icon: Truck },
  in_transit: { label: "Livraison en cours", color: "bg-primary", icon: Truck },
  delivered: { label: "Livré ✅", color: "bg-emerald-500", icon: CheckCircle2 },
};

const DriverLiveMap = ({ delivery, driverName }: DriverLiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(
    delivery.driver_current_lat && delivery.driver_current_lng
      ? { lat: delivery.driver_current_lat, lng: delivery.driver_current_lng }
      : null
  );

  // Subscribe to realtime driver position updates
  useEffect(() => {
    if (!delivery.id) return;

    const channel = supabase
      .channel(`delivery-tracking-${delivery.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
          filter: `id=eq.${delivery.id}`,
        },
        (payload: any) => {
          const newData = payload.new;
          if (newData.driver_current_lat && newData.driver_current_lng) {
            setDriverPos({
              lat: Number(newData.driver_current_lat),
              lng: Number(newData.driver_current_lng),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [delivery.id]);

  // Initialize & update Leaflet map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Default center: dropoff or Lomé
      const centerLat = delivery.dropoff_lat || 6.1725;
      const centerLng = delivery.dropoff_lng || 1.2314;

      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      // Dropoff marker (buyer location)
      if (delivery.dropoff_lat && delivery.dropoff_lng) {
        const dropoffIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#22c55e;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([delivery.dropoff_lat, delivery.dropoff_lng], { icon: dropoffIcon })
          .addTo(map)
          .bindPopup(`<b>📍 Votre adresse</b><br/>${delivery.dropoff_address || "Point de livraison"}`);
      }

      // Pickup marker (seller location)
      if (delivery.pickup_lat && delivery.pickup_lng) {
        const pickupIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([delivery.pickup_lat, delivery.pickup_lng], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`<b>📦 Point de collecte</b><br/>${delivery.pickup_address || "Fournisseur"}`);
      }

      // Driver marker
      if (driverPos) {
        const driverIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#f97316;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(249,115,22,0.5);animation:pulse 2s infinite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        driverMarkerRef.current = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
          .addTo(map)
          .bindPopup(`<b>🛵 ${driverName || "Livreur"}</b><br/>Position en temps réel`);
      }

      // Fit bounds to show all markers
      const bounds = L.latLngBounds([]);
      if (delivery.dropoff_lat && delivery.dropoff_lng) bounds.extend([delivery.dropoff_lat, delivery.dropoff_lng]);
      if (delivery.pickup_lat && delivery.pickup_lng) bounds.extend([delivery.pickup_lat, delivery.pickup_lng]);
      if (driverPos) bounds.extend([driverPos.lat, driverPos.lng]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
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
  }, [delivery.dropoff_lat, delivery.dropoff_lng, delivery.pickup_lat, delivery.pickup_lng]);

  // Update driver marker position in realtime
  useEffect(() => {
    if (!mapInstanceRef.current || !driverPos) return;

    const L = (window as any).L;
    if (!L) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
    } else {
      const driverIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:#f97316;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(249,115,22,0.5)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      driverMarkerRef.current = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>🛵 ${driverName || "Livreur"}</b>`);
    }
  }, [driverPos, driverName]);

  const status = statusConfig[delivery.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden border-primary/20">
      <div className="p-3 flex items-center justify-between bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${delivery.status === "delivered" ? "bg-emerald-500" : "bg-orange-500 animate-pulse"}`} />
          <span className="text-xs font-semibold text-foreground">Suivi en direct</span>
        </div>
        <Badge className={`${status.color} text-white text-[10px] gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>
      
      <div ref={mapRef} className="w-full h-[250px] sm:h-[300px] relative z-0" />

      <CardContent className="p-3 space-y-2">
        {/* Driver info */}
        {driverName && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">{driverName}</p>
              <p className="text-muted-foreground text-[10px]">
                {driverPos ? "Position mise à jour en temps réel" : "En attente de la position GPS"}
              </p>
            </div>
          </div>
        )}

        {/* Distance & ETA */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {delivery.distance_km && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {Number(delivery.distance_km).toFixed(1)} km
            </span>
          )}
          {delivery.estimated_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{delivery.estimated_minutes} min
            </span>
          )}
          {delivery.dropoff_address && (
            <span className="flex items-center gap-1 truncate">
              <Navigation className="w-3 h-3" />
              {delivery.dropoff_address}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-1 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Livreur
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Votre adresse
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Collecte
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverLiveMap;
