import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const pickupIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const dropoffIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [points, map]);
  return null;
}

interface DeliveryLiveMapProps {
  deliveryId: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  driverCurrentLat?: number | null;
  driverCurrentLng?: number | null;
}

const DeliveryLiveMap = ({
  deliveryId,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupAddress,
  dropoffAddress,
  driverCurrentLat: initialDriverLat,
  driverCurrentLng: initialDriverLng,
}: DeliveryLiveMapProps) => {
  const [driverLat, setDriverLat] = useState(initialDriverLat);
  const [driverLng, setDriverLng] = useState(initialDriverLng);

  // Subscribe to realtime driver position updates
  useEffect(() => {
    const channel = supabase
      .channel(`delivery-track-${deliveryId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
          filter: `id=eq.${deliveryId}`,
        },
        (payload: any) => {
          const newData = payload.new;
          if (newData.driver_current_lat != null) setDriverLat(newData.driver_current_lat);
          if (newData.driver_current_lng != null) setDriverLng(newData.driver_current_lng);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryId]);

  // Build map points
  const points: [number, number][] = [];
  if (pickupLat && pickupLng) points.push([pickupLat, pickupLng]);
  if (dropoffLat && dropoffLng) points.push([dropoffLat, dropoffLng]);
  if (driverLat && driverLng) points.push([Number(driverLat), Number(driverLng)]);

  // Fallback center
  const center: [number, number] = points.length > 0
    ? points[0]
    : [6.1725, 1.2314]; // Lomé default

  if (points.length === 0) {
    return (
      <div className="h-[250px] rounded-xl bg-muted flex items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          En attente de la position du livreur...
        </div>
      </div>
    );
  }

  // Route line from pickup → driver → dropoff
  const routePoints: [number, number][] = [];
  if (pickupLat && pickupLng) routePoints.push([pickupLat, pickupLng]);
  if (driverLat && driverLng) routePoints.push([Number(driverLat), Number(driverLng)]);
  if (dropoffLat && dropoffLng) routePoints.push([dropoffLat, dropoffLng]);

  return (
    <div className="h-[250px] rounded-xl overflow-hidden border border-border">
      <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        {pickupLat && pickupLng && (
          <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
            <Popup><span className="text-xs font-medium">📦 {pickupAddress || "Point de collecte"}</span></Popup>
          </Marker>
        )}

        {dropoffLat && dropoffLng && (
          <Marker position={[dropoffLat, dropoffLng]} icon={dropoffIcon}>
            <Popup><span className="text-xs font-medium">📍 {dropoffAddress || "Point de livraison"}</span></Popup>
          </Marker>
        )}

        {driverLat && driverLng && (
          <Marker position={[Number(driverLat), Number(driverLng)]} icon={driverIcon}>
            <Popup><span className="text-xs font-medium">🚚 Livreur en route</span></Popup>
          </Marker>
        )}

        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: "hsl(142, 71%, 45%)", weight: 3, dashArray: "8 4" }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryLiveMap;
