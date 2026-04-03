import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Loader2, Globe } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useToast } from "@/hooks/use-toast";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const countries = [
  { code: "TG", name: "Togo", flag: "🇹🇬", center: [6.13, 1.22] as [number, number] },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", center: [6.37, 2.39] as [number, number] },
  { code: "GH", name: "Ghana", flag: "🇬🇭", center: [5.56, -0.19] as [number, number] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", center: [5.35, -4.01] as [number, number] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", center: [14.69, -17.44] as [number, number] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", center: [3.87, 11.52] as [number, number] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", center: [12.37, -1.52] as [number, number] },
  { code: "ML", name: "Mali", flag: "🇲🇱", center: [12.64, -8.0] as [number, number] },
  { code: "NE", name: "Niger", flag: "🇳🇪", center: [13.51, 2.11] as [number, number] },
  { code: "GA", name: "Gabon", flag: "🇬🇦", center: [0.39, 9.45] as [number, number] },
];

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 12); }, [center, map]);
  return null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLocation: string;
  onSave: (location: string, country: string) => void;
}

const LocationPickerDialog = ({ open, onOpenChange, currentLocation, onSave }: Props) => {
  const [detecting, setDetecting] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("TG");
  const [coords, setCoords] = useState<[number, number]>([6.13, 1.22]);
  const { toast } = useToast();

  // Parse current location on open
  useEffect(() => {
    if (open && currentLocation) {
      const parts = currentLocation.split(",").map(s => s.trim());
      if (parts.length >= 1) setCity(parts[0]);
      if (parts.length >= 2) {
        const found = countries.find(c => c.code === parts[1] || c.name === parts[1]);
        if (found) setCountry(found.code);
      }
    }
  }, [open, currentLocation]);

  const detectLocation = useCallback(async () => {
    setDetecting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      const { latitude, longitude } = pos.coords;
      setCoords([latitude, longitude]);

      // Reverse geocode
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`);
      const data = await res.json();
      const detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.state || "";
      const countryCode = data.address?.country_code?.toUpperCase() || "TG";
      
      setCity(detectedCity);
      const found = countries.find(c => c.code === countryCode);
      if (found) setCountry(countryCode);
      
      toast({ title: "Position détectée", description: `${detectedCity}, ${found?.name || countryCode}` });
    } catch {
      toast({ title: "Erreur GPS", description: "Impossible de détecter votre position", variant: "destructive" });
    }
    setDetecting(false);
  }, [toast]);

  // Auto-detect on first open if no location set
  useEffect(() => {
    if (open && !city && navigator.geolocation) {
      detectLocation();
    }
  }, [open]);

  // Update coords when country changes
  useEffect(() => {
    const c = countries.find(co => co.code === country);
    if (c && !city) setCoords(c.center);
  }, [country]);

  const handleSave = () => {
    const countryData = countries.find(c => c.code === country);
    const locationStr = city ? `${city}, ${country}` : countryData?.name || country;
    onSave(locationStr, country);
    onOpenChange(false);
  };

  const selectedCountry = countries.find(c => c.code === country);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5 text-primary" />
            Zone de livraison
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Current location */}
          <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Position actuelle</p>
              <p className="text-xs font-medium truncate">{currentLocation}</p>
            </div>
          </div>

          {/* Auto-detect button */}
          <Button variant="outline" className="w-full gap-2 text-xs h-9" onClick={detectLocation} disabled={detecting}>
            {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            {detecting ? "Détection en cours..." : "Détecter automatiquement"}
          </Button>

          {/* Mini map */}
          <div className="h-36 rounded-lg overflow-hidden border border-border">
            <MapContainer center={coords} zoom={12} className="h-full w-full" zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={coords} />
              <MapUpdater center={coords} />
            </MapContainer>
          </div>

          {/* Country selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Pays
            </label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c.code} value={c.code} className="text-xs">
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City/Zone input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Ville / Zone</label>
            <Input placeholder="Ex: Lomé, Kara, Sokodé..." value={city} onChange={(e) => setCity(e.target.value)} className="text-xs h-9" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 text-xs h-9" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button variant="hero" className="flex-1 text-xs h-9" onClick={handleSave}>Enregistrer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPickerDialog;
