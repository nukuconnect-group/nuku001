import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Loader2, Globe, Search } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Comprehensive world country list with focus on Africa
const countries: { code: string; name: string; flag: string; center: [number, number] }[] = [
  // Afrique de l'Ouest
  { code: "TG", name: "Togo", flag: "🇹🇬", center: [6.13, 1.22] },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", center: [6.37, 2.39] },
  { code: "GH", name: "Ghana", flag: "🇬🇭", center: [5.56, -0.19] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", center: [5.35, -4.01] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", center: [14.69, -17.44] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", center: [12.37, -1.52] },
  { code: "ML", name: "Mali", flag: "🇲🇱", center: [12.64, -8.0] },
  { code: "NE", name: "Niger", flag: "🇳🇪", center: [13.51, 2.11] },
  { code: "NG", name: "Nigéria", flag: "🇳🇬", center: [9.08, 8.68] },
  { code: "GN", name: "Guinée", flag: "🇬🇳", center: [9.95, -9.7] },
  { code: "GW", name: "Guinée-Bissau", flag: "🇬🇼", center: [11.86, -15.59] },
  { code: "LR", name: "Libéria", flag: "🇱🇷", center: [6.43, -9.43] },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱", center: [8.46, -11.78] },
  { code: "CV", name: "Cap-Vert", flag: "🇨🇻", center: [16.0, -24.0] },
  { code: "GM", name: "Gambie", flag: "🇬🇲", center: [13.44, -15.31] },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷", center: [20.0, -12.0] },
  // Afrique centrale
  { code: "CM", name: "Cameroun", flag: "🇨🇲", center: [3.87, 11.52] },
  { code: "GA", name: "Gabon", flag: "🇬🇦", center: [0.39, 9.45] },
  { code: "CG", name: "Congo", flag: "🇨🇬", center: [-4.26, 15.24] },
  { code: "CD", name: "RD Congo", flag: "🇨🇩", center: [-4.32, 15.31] },
  { code: "CF", name: "Centrafrique", flag: "🇨🇫", center: [4.39, 18.55] },
  { code: "TD", name: "Tchad", flag: "🇹🇩", center: [12.13, 15.05] },
  { code: "GQ", name: "Guinée équatoriale", flag: "🇬🇶", center: [3.75, 8.78] },
  { code: "ST", name: "São Tomé-et-Príncipe", flag: "🇸🇹", center: [0.34, 6.73] },
  { code: "AO", name: "Angola", flag: "🇦🇴", center: [-8.84, 13.23] },
  // Afrique de l'Est
  { code: "KE", name: "Kenya", flag: "🇰🇪", center: [-1.29, 36.82] },
  { code: "TZ", name: "Tanzanie", flag: "🇹🇿", center: [-6.79, 39.21] },
  { code: "UG", name: "Ouganda", flag: "🇺🇬", center: [0.35, 32.58] },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", center: [-1.95, 30.06] },
  { code: "BI", name: "Burundi", flag: "🇧🇮", center: [-3.38, 29.36] },
  { code: "ET", name: "Éthiopie", flag: "🇪🇹", center: [9.03, 38.74] },
  { code: "ER", name: "Érythrée", flag: "🇪🇷", center: [15.34, 38.93] },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯", center: [11.59, 43.15] },
  { code: "SO", name: "Somalie", flag: "🇸🇴", center: [2.04, 45.34] },
  { code: "SS", name: "Soudan du Sud", flag: "🇸🇸", center: [4.85, 31.58] },
  { code: "SD", name: "Soudan", flag: "🇸🇩", center: [15.59, 32.53] },
  { code: "MG", name: "Madagascar", flag: "🇲🇬", center: [-18.88, 47.51] },
  { code: "MU", name: "Maurice", flag: "🇲🇺", center: [-20.35, 57.55] },
  { code: "SC", name: "Seychelles", flag: "🇸🇨", center: [-4.62, 55.45] },
  { code: "KM", name: "Comores", flag: "🇰🇲", center: [-11.7, 43.25] },
  // Afrique australe
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦", center: [-25.75, 28.19] },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", center: [-17.83, 31.05] },
  { code: "ZM", name: "Zambie", flag: "🇿🇲", center: [-15.39, 28.32] },
  { code: "MW", name: "Malawi", flag: "🇲🇼", center: [-13.96, 33.79] },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", center: [-25.97, 32.57] },
  { code: "NA", name: "Namibie", flag: "🇳🇦", center: [-22.56, 17.08] },
  { code: "BW", name: "Botswana", flag: "🇧🇼", center: [-24.66, 25.91] },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿", center: [-26.31, 31.13] },
  { code: "LS", name: "Lesotho", flag: "🇱🇸", center: [-29.31, 27.48] },
  // Afrique du Nord
  { code: "MA", name: "Maroc", flag: "🇲🇦", center: [34.02, -6.83] },
  { code: "DZ", name: "Algérie", flag: "🇩🇿", center: [36.75, 3.06] },
  { code: "TN", name: "Tunisie", flag: "🇹🇳", center: [36.81, 10.18] },
  { code: "LY", name: "Libye", flag: "🇱🇾", center: [32.89, 13.18] },
  { code: "EG", name: "Égypte", flag: "🇪🇬", center: [30.04, 31.24] },
  // Europe
  { code: "FR", name: "France", flag: "🇫🇷", center: [48.85, 2.35] },
  { code: "BE", name: "Belgique", flag: "🇧🇪", center: [50.85, 4.35] },
  { code: "CH", name: "Suisse", flag: "🇨🇭", center: [46.95, 7.45] },
  { code: "DE", name: "Allemagne", flag: "🇩🇪", center: [52.52, 13.41] },
  { code: "IT", name: "Italie", flag: "🇮🇹", center: [41.9, 12.5] },
  { code: "ES", name: "Espagne", flag: "🇪🇸", center: [40.42, -3.7] },
  { code: "PT", name: "Portugal", flag: "🇵🇹", center: [38.72, -9.14] },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧", center: [51.51, -0.13] },
  { code: "NL", name: "Pays-Bas", flag: "🇳🇱", center: [52.37, 4.9] },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺", center: [49.61, 6.13] },
  // Amériques
  { code: "US", name: "États-Unis", flag: "🇺🇸", center: [38.9, -77.04] },
  { code: "CA", name: "Canada", flag: "🇨🇦", center: [45.42, -75.7] },
  { code: "BR", name: "Brésil", flag: "🇧🇷", center: [-15.78, -47.93] },
  { code: "MX", name: "Mexique", flag: "🇲🇽", center: [19.43, -99.13] },
  { code: "HT", name: "Haïti", flag: "🇭🇹", center: [18.59, -72.31] },
  // Asie
  { code: "CN", name: "Chine", flag: "🇨🇳", center: [39.9, 116.4] },
  { code: "IN", name: "Inde", flag: "🇮🇳", center: [28.61, 77.21] },
  { code: "JP", name: "Japon", flag: "🇯🇵", center: [35.68, 139.69] },
  { code: "AE", name: "Émirats arabes unis", flag: "🇦🇪", center: [24.47, 54.37] },
  { code: "SA", name: "Arabie saoudite", flag: "🇸🇦", center: [24.71, 46.68] },
  { code: "TR", name: "Turquie", flag: "🇹🇷", center: [39.93, 32.86] },
  // Océanie
  { code: "AU", name: "Australie", flag: "🇦🇺", center: [-35.28, 149.13] },
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
  const [countrySearch, setCountrySearch] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

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

      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`);
      const data = await res.json();
      const detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.state || "";
      const countryCode = data.address?.country_code?.toUpperCase() || "TG";
      
      setCity(detectedCity);
      const found = countries.find(c => c.code === countryCode);
      if (found) setCountry(countryCode);
      
      toast({ title: "Position détectée", description: `${detectedCity}, ${found?.name || countryCode}` });
    } catch {
      toast({ title: "GPS indisponible", description: "Sélectionnez votre pays et votre ville ci-dessous.", });
    }
    setDetecting(false);
  }, [toast]);

  // Auto-detect on first open if no location set
  useEffect(() => {
    if (open && !city && navigator.geolocation) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Update coords when country changes
  useEffect(() => {
    const c = countries.find(co => co.code === country);
    if (c && !city) setCoords(c.center);
  }, [country, city]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

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

          {/* Country selector with search */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Pays
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCountryDropdownOpen(o => !o)}
                className="w-full h-9 px-3 text-xs border border-input bg-background rounded-md flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <span>{selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : "Sélectionner un pays"}</span>
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {countryDropdownOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder={t("common.search")}
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        className="h-8 text-xs pl-7"
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {filteredCountries.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">Aucun pays trouvé</p>
                    ) : filteredCountries.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCountry(c.code);
                          setCountryDropdownOpen(false);
                          setCountrySearch("");
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${
                          c.code === country ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {c.flag} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
