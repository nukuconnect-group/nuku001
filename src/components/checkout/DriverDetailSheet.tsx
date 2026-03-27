import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Truck, MessageCircle, Navigation, Phone, Shield } from "lucide-react";
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

interface Driver {
  id: string;
  vehicle_type: string;
  rating: number;
  total_deliveries: number;
  zone: string;
  current_lat?: number;
  current_lng?: number;
  license_plate?: string;
  profile?: { full_name: string; avatar_url: string; phone?: string };
}

interface DriverDetailSheetProps {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distanceKm: number | null;
  onChat?: (driverId: string) => void;
}

const zoneCoords: Record<string, [number, number]> = {
  "Lomé Centre": [6.1319, 1.2228],
  "Adidogomé": [6.1700, 1.1700],
  "Bè": [6.1350, 1.2450],
  "Agoè": [6.1900, 1.2100],
  "Tokoin": [6.1400, 1.2100],
};

const vehicleLabels: Record<string, string> = {
  moto: "🏍️ Moto",
  voiture: "🚗 Voiture",
  velo: "🚲 Vélo",
  camion: "🚛 Camion",
};

const DriverDetailSheet = ({ driver, open, onOpenChange, distanceKm, onChat }: DriverDetailSheetProps) => {
  if (!driver) return null;

  const coords: [number, number] = driver.current_lat && driver.current_lng
    ? [driver.current_lat, driver.current_lng]
    : zoneCoords[driver.zone] || [6.1319, 1.2228];

  const estimateTime = (km: number | null) => {
    if (!km) return "~30 min";
    if (km < 10) return `~${Math.max(15, Math.round(km * 3))} min`;
    if (km < 50) return `~${Math.round(km * 2.5)} min`;
    return `~${Math.round(km * 2)} min`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-y-auto">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-base">Profil du livreur</SheetTitle>
        </SheetHeader>

        {/* Profile header */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
              {driver.profile?.avatar_url ? (
                <img src={driver.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Truck className="w-7 h-7 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{driver.profile?.full_name || "Livreur"}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px] gap-0.5">
                  <Star className="w-2.5 h-2.5 text-accent fill-accent" />
                  {(driver.rating || 5).toFixed(1)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {vehicleLabels[driver.vehicle_type] || driver.vehicle_type}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  <Shield className="w-2.5 h-2.5 mr-0.5" />
                  Vérifié
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-primary">{driver.total_deliveries || 0}</p>
            <p className="text-[10px] text-muted-foreground">Livraisons</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-primary">{estimateTime(distanceKm)}</p>
            <p className="text-[10px] text-muted-foreground">Temps estimé</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-primary">{distanceKm ? `${distanceKm.toFixed(1)} km` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">Distance</p>
          </div>
        </div>

        {/* Info details */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">Zone :</span>
            <span className="font-medium">{driver.zone || "Non définie"}</span>
          </div>
          {driver.license_plate && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">Plaque :</span>
              <span className="font-medium">{driver.license_plate}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">Disponibilité :</span>
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
              En ligne
            </Badge>
          </div>
        </div>

        {/* Map */}
        <div className="px-4 pb-3">
          <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-primary" />
            Position actuelle
          </p>
          <div className="h-40 rounded-lg overflow-hidden border border-border">
            <MapContainer center={coords} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={coords}>
                <Popup>{driver.profile?.full_name || "Livreur"} — {driver.zone}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-6 flex gap-2">
          <Button
            variant="hero"
            className="flex-1 gap-2"
            onClick={() => onChat?.(driver.id)}
          >
            <MessageCircle className="w-4 h-4" />
            Discuter
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DriverDetailSheet;
