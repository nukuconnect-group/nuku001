import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Store, Package, MapPin, Navigation, Ruler, AlertCircle, Loader2, LocateFixed } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "./CartContext";
import { supabase } from "@/integrations/supabase/client";
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

// Zones with lat/lng coordinates and quarters
const togoZones = [
  { id: "lome", name: "Lomé", lat: 6.1375, lng: 1.2123, quarters: ["Bè", "Adidogomé", "Tokoin", "Nyékonakpoè", "Hédzranawoé", "Agoè", "Kélégougan", "Kodjoviakopé", "Djidjolé", "Baguida", "Aflao-Sagbado", "Adakpamé", "Amadahomé", "Gbossimé", "Akossombo", "Agbalépédogan", "Forever", "Attiégou", "Atikoumé", "Cassablanca"] },
  { id: "kara", name: "Kara", lat: 9.5511, lng: 1.1861, quarters: ["Tomdè", "Lama", "Kpindjal", "Tchitchao", "Pio", "Waragni"] },
  { id: "sokode", name: "Sokodé", lat: 8.9833, lng: 1.1333, quarters: ["Kpangalam", "Didaouré", "Komah", "Tchalo", "Kossobio"] },
  { id: "atakpame", name: "Atakpamé", lat: 7.5333, lng: 1.1333, quarters: ["Agbonou", "Sémassi", "Hihéatro", "Kamina", "Agodjololo"] },
  { id: "kpalime", name: "Kpalimé", lat: 6.9000, lng: 0.6333, quarters: ["Kloto", "Tové", "Nyivémé", "Kpodzi", "Agomé-Tomegbé"] },
  { id: "dapaong", name: "Dapaong", lat: 10.8625, lng: 0.2075, quarters: ["Nassablé", "Kombonloaga", "Natbagou", "Bogou"] },
  { id: "tsevie", name: "Tsévié", lat: 6.4333, lng: 1.2167, quarters: ["Kévé", "Davié", "Mission Tové", "Gbatopé"] },
  { id: "aneho", name: "Aného", lat: 6.2333, lng: 1.6000, quarters: ["Adjido", "Glidji", "Agbodrafo", "Akoumapé"] },
  { id: "lome-port", name: "Lomé (Port)", lat: 6.1319, lng: 1.2850, quarters: ["Zone Portuaire", "Adidoadin", "Katanga"] },
  { id: "notse", name: "Notsé", lat: 6.9500, lng: 1.1667, quarters: ["Tado", "Kpékplémé", "Agbélouvé"] },
  { id: "bassar", name: "Bassar", lat: 9.2500, lng: 0.7833, quarters: ["Kabou", "Bangéli", "Bitchabé"] },
  { id: "mango", name: "Mango", lat: 10.3667, lng: 0.4667, quarters: ["Sansanné-Mango", "Barkoissi", "Nagbéni"] },
];

// Haversine distance in km
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findClosestZone(lat: number, lng: number) {
  let closest = togoZones[0];
  let minDist = Infinity;
  for (const z of togoZones) {
    const d = calcDistance(lat, lng, z.lat, z.lng);
    if (d < minDist) { minDist = d; closest = z; }
  }
  return closest;
}

// Try to fuzzy-match a location string (e.g. "Lomé", "LOME-AGOE, Togo", "Kara") to a zone
function matchLocationToZone(location: string): typeof togoZones[0] | null {
  if (!location) return null;
  const normalized = location.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Exact match first
  for (const z of togoZones) {
    const zNorm = z.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized === zNorm || normalized.startsWith(zNorm + ",") || normalized.startsWith(zNorm + " ") || normalized.includes(zNorm)) {
      return z;
    }
    if (z.quarters.some((q) => normalized.includes(q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
      return z;
    }
  }
  return null;
}

export interface DeliveryDistanceInfo {
  maxDistance: number;
  minDistance: number;
  closestSeller: string;
  furthestSeller: string;
  hasMultiple: boolean;
  sellerDistances: Array<{ name: string; location: string; distanceKm: number }>;
}

// Gozem-inspired pricing tiers (base fare + per-km rate)
// Minimum delivery price: 1000 FCFA
const MIN_DELIVERY_PRICE = 1000;

function getDeliveryPriceByDistance(distanceKm: number): { price: number; tier: string; rawKm: number } {
  const baseFare = 300;
  let rawPrice: number;
  let tier: string;
  if (distanceKm <= 3) { rawPrice = baseFare + Math.round(distanceKm * 150); tier = "Course courte (≤ 3 km)"; }
  else if (distanceKm <= 7) { rawPrice = baseFare + Math.round(distanceKm * 130); tier = "Zone proche (≤ 7 km)"; }
  else if (distanceKm <= 15) { rawPrice = baseFare + Math.round(distanceKm * 110); tier = "Zone urbaine (≤ 15 km)"; }
  else if (distanceKm <= 30) { rawPrice = baseFare + Math.round(distanceKm * 100); tier = "Périurbain (≤ 30 km)"; }
  else if (distanceKm <= 80) { rawPrice = baseFare + Math.round(distanceKm * 80); tier = "Inter-ville (≤ 80 km)"; }
  else if (distanceKm <= 200) { rawPrice = baseFare + Math.round(distanceKm * 60); tier = "Régional (≤ 200 km)"; }
  else { rawPrice = baseFare + Math.round(distanceKm * 50); tier = "Longue distance (> 200 km)"; }
  // Enforce minimum
  const price = Math.max(rawPrice, MIN_DELIVERY_PRICE);
  return { price, tier, rawKm: distanceKm };
}

const baseDeliveryOptions = [
  { id: "pickup", name: "Retrait sur place", description: "Récupérez directement chez le fournisseur", icon: Store, tag: "Gratuit", fixed: true, fixedPrice: 0 },
  { id: "livreur", name: "Livreur NukuConnect", description: "Livraison par nos livreurs partenaires", icon: Truck, tag: "Recommandé", fixed: false, fixedPrice: 0 },
  { id: "international", name: "Livraison internationale", description: "Nukuconnect SAS gère l'expédition via ses partenaires de transport international", icon: Package, tag: "International", fixed: true, fixedPrice: 0 },
];

export function buildDeliveryOptions(distanceKm: number | null) {
  return baseDeliveryOptions.map(opt => {
    if (opt.id === "international") return { ...opt, price: 0 };
    if (opt.fixed) return { ...opt, price: opt.fixedPrice };
    if (distanceKm === null) return { ...opt, price: 0 };
    const { price } = getDeliveryPriceByDistance(distanceKm);
    return { ...opt, price: Math.round(price / 100) * 100 };
  });
}

export const deliveryOptions = baseDeliveryOptions.map(o => ({
  ...o, price: o.fixedPrice,
}));

interface DeliveryZoneMapProps {
  deliveryMethod: string;
  onDeliveryMethodChange: (method: string) => void;
  city: string;
  onCityChange: (city: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
  quarter: string;
  onQuarterChange: (quarter: string) => void;
  onDynamicPriceChange?: (price: number) => void;
  onDistanceInfoChange?: (info: DeliveryDistanceInfo | null) => void;
}

const DeliveryZoneMap = ({
  deliveryMethod, onDeliveryMethodChange,
  city, onCityChange, address, onAddressChange,
  quarter, onQuarterChange, onDynamicPriceChange, onDistanceInfoChange,
}: DeliveryZoneMapProps) => {
  const { t, formatPrice } = useLanguage();
  const { items } = useCart();
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [quarterSearch, setQuarterSearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const quarterRef = useRef<HTMLDivElement>(null);
  const hasAutoDetected = useRef(false);
  const markerRef = useRef<L.Marker>(null);

  // Auto-detect location on mount: always prefer the buyer's real GPS position for delivery.
  useEffect(() => {
    if (hasAutoDetected.current) return;
    hasAutoDetected.current = true;
    
    // If city is already a valid zone, just sync the search field
    const exactZone = togoZones.find(z => z.name === city);
    if (exactZone) {
      setCitySearch(exactZone.name);
      setMarkerPos([exactZone.lat, exactZone.lng]);
      if (address) return;
    }
    
    // Try fuzzy-matching the city prop (e.g. "Lome, Togo" → "Lomé")
    if (city) {
      const matched = matchLocationToZone(city);
      if (matched) {
        onCityChange(matched.name);
        setCitySearch(matched.name);
        setMarkerPos([matched.lat, matched.lng]);
        if (address) return;
      }
    }
    
    // Fall back to GPS detection
    detectLocation();
  }, [city]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setShowCityDropdown(false);
      if (quarterRef.current && !quarterRef.current.contains(e.target as Node)) setShowQuarterDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkerDrag = useCallback((lat: number, lng: number) => {
    setMarkerPos([lat, lng]);
    const zone = findClosestZone(lat, lng);
    onCityChange(zone.name);
    setCitySearch(zone.name);
  }, [onCityChange]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      // Fallback to Lomé as default
      const defaultZone = togoZones[0]; // Lomé
      onCityChange(defaultZone.name);
      setCitySearch(defaultZone.name);
      setMarkerPos([defaultZone.lat, defaultZone.lng]);
      setGeoError("Géolocalisation non supportée — Lomé sélectionné par défaut");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const zone = findClosestZone(lat, lng);
        onCityChange(zone.name);
        setCitySearch(zone.name);
        setMarkerPos([lat, lng]);
        try {
          const { data } = await supabase.functions.invoke("reverse-geocode", {
            body: { lat, lng },
          });
          const geo = data as { city?: string; quarter?: string; display?: string } | null;
          if (geo?.city) {
            const matched = matchLocationToZone(geo.city) || matchLocationToZone(geo.display || "");
            const finalZone = matched || zone;
            onCityChange(finalZone.name);
            setCitySearch(finalZone.name);
          }
          if (geo?.quarter) onQuarterChange(geo.quarter);
          if (geo?.display) onAddressChange(geo.display);
          else onAddressChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          onAddressChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setGeoLoading(false);
      },
      () => {
        // Fallback to Lomé when position unavailable
        const defaultZone = togoZones[0]; // Lomé
        if (!city) {
          onCityChange(defaultZone.name);
          setCitySearch(defaultZone.name);
          setMarkerPos([defaultZone.lat, defaultZone.lng]);
        }
        setGeoError("Position non disponible — Lomé sélectionné par défaut");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onCityChange, onQuarterChange, onAddressChange, city]);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return togoZones;
    const q = citySearch.toLowerCase();
    return togoZones.filter(z => z.name.toLowerCase().includes(q));
  }, [citySearch]);

  const selectedZone = togoZones.find(z => z.name === city);

  const filteredQuarters = useMemo(() => {
    if (!selectedZone) return [];
    const quarters = selectedZone.quarters || [];
    if (!quarterSearch.trim()) return quarters;
    const q = quarterSearch.toLowerCase();
    return quarters.filter(qr => qr.toLowerCase().includes(q));
  }, [selectedZone, quarterSearch]);

  const buyerZone = togoZones.find(z => z.name === city);

  const sellerLocations = useMemo(() => {
    const locs = new Set(items.map(i => i.product.location).filter(Boolean));
    return Array.from(locs).map(loc => {
      const zone = matchLocationToZone(loc);
      return { name: loc, zone };
    });
  }, [items]);

  const distanceInfo = useMemo(() => {
    const buyerPoint = markerPos
      ? { lat: markerPos[0], lng: markerPos[1] }
      : buyerZone
        ? { lat: buyerZone.lat, lng: buyerZone.lng }
        : null;
    if (!buyerPoint || sellerLocations.length === 0) return null;
    let maxDist = 0;
    let closestSeller = "";
    let furthestSeller = "";
    let minDist = Infinity;
    const sellerDistances: DeliveryDistanceInfo["sellerDistances"] = [];

    for (const sl of sellerLocations) {
      if (!sl.zone) continue;
      const d = calcDistance(buyerPoint.lat, buyerPoint.lng, sl.zone.lat, sl.zone.lng);
      sellerDistances.push({ name: sl.name, location: sl.name, distanceKm: Number(d.toFixed(1)) });
      if (d > maxDist) { maxDist = d; furthestSeller = sl.name; }
      if (d < minDist) { minDist = d; closestSeller = sl.name; }
    }
    if (sellerDistances.length === 0) return null;
    return {
      maxDistance: Number(maxDist.toFixed(1)),
      minDistance: Number(minDist.toFixed(1)),
      closestSeller,
      furthestSeller,
      hasMultiple: sellerDistances.length > 1,
      sellerDistances,
    };
  }, [buyerZone, markerPos, sellerLocations]);

  const computedOptions = useMemo(() => {
    return buildDeliveryOptions(distanceInfo?.maxDistance ?? null);
  }, [distanceInfo]);
  const isInternational = deliveryMethod === "international";

  const selectedOption = computedOptions.find(o => o.id === deliveryMethod);
  const currentPrice = selectedOption?.price ?? 0;

  useEffect(() => {
    onDynamicPriceChange?.(currentPrice);
    onDistanceInfoChange?.(distanceInfo);
  }, [currentPrice, distanceInfo, onDynamicPriceChange, onDistanceInfoChange]);

  // Set initial marker position when city changes
  useEffect(() => {
    if (buyerZone && !markerPos) {
      setMarkerPos([buyerZone.lat, buyerZone.lng]);
    }
  }, [buyerZone]);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Truck className="w-5 h-5 text-primary" />
          Mode & zone de livraison
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        {/* Delivery method selection */}
        <RadioGroup value={deliveryMethod} onValueChange={onDeliveryMethodChange}>
          <div className="space-y-2">
            {computedOptions.map((option) => (
              <div key={option.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  deliveryMethod === option.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => onDeliveryMethodChange(option.id)}>
                <RadioGroupItem value={option.id} id={`del-${option.id}`} />
                <option.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor={`del-${option.id}`} className="font-medium cursor-pointer text-xs sm:text-sm">{option.name}</Label>
                    <Badge variant="secondary" className="text-[9px]">{option.tag}</Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{option.description}</p>
                </div>
                <span className="font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">
                  {option.price === 0
                    ? (option.id === "pickup" ? "Gratuit" : option.id === "international" ? "Sur devis" : "Sélectionnez une ville")
                    : formatPrice(option.price)}
                </span>
              </div>
            ))}
          </div>
        </RadioGroup>

        {/* Delivery address form */}
        {deliveryMethod !== "pickup" && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-xl border border-border">
            {isInternational ? (
              <div className="space-y-3">
                <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3 text-xs text-foreground">
                  <p className="font-semibold mb-1">Expédition internationale</p>
                  <p className="text-muted-foreground">
                    Nukuconnect SAS coordonne la livraison avec ses partenaires de transport international. Renseignez simplement votre destination complète.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Destination (ville, pays) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    placeholder="Ex : Paris, France"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Adresse de livraison
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8"
                    onClick={detectLocation}
                    disabled={geoLoading}
                  >
                    {geoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                    Ma position
                  </Button>
                </div>

                {geoError && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{geoError}
                  </p>
                )}

                {city && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground">
                      Zone détectée : <strong>{city}</strong>{quarter ? `, ${quarter}` : ""}
                    </span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 relative" ref={cityRef}>
                    <Label className="text-xs">
                      Ville <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={citySearch || city}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setShowCityDropdown(true);
                        if (!e.target.value) onCityChange("");
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      placeholder="Tapez ou sélectionnez..."
                      className="h-9 text-sm"
                    />
                    {showCityDropdown && filteredCities.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCities.map((zone) => (
                          <button
                            key={zone.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors flex items-center gap-2 ${
                              city === zone.name ? "bg-primary/5 font-semibold text-primary" : "text-foreground"
                            }`}
                            onClick={() => {
                              onCityChange(zone.name);
                              setCitySearch(zone.name);
                              setShowCityDropdown(false);
                              setMarkerPos([zone.lat, zone.lng]);
                              onQuarterChange("");
                              setQuarterSearch("");
                            }}
                          >
                            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            {zone.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 relative" ref={quarterRef}>
                    <Label className="text-xs">Quartier</Label>
                    <Input
                      value={quarterSearch || quarter}
                      onChange={(e) => {
                        setQuarterSearch(e.target.value);
                        onQuarterChange(e.target.value);
                        setShowQuarterDropdown(true);
                      }}
                      onFocus={() => setShowQuarterDropdown(true)}
                      placeholder={selectedZone ? "Tapez votre quartier..." : "Sélectionnez d'abord une ville"}
                      className="h-9 text-sm"
                      disabled={!selectedZone}
                    />
                    {showQuarterDropdown && filteredQuarters.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredQuarters.map((q) => (
                          <button
                            key={q}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors flex items-center gap-2 ${
                              quarter === q ? "bg-primary/5 font-semibold text-primary" : "text-foreground"
                            }`}
                            onClick={() => {
                              onQuarterChange(q);
                              setQuarterSearch(q);
                              setShowQuarterDropdown(false);
                            }}
                          >
                            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">
                Adresse complète <span className="text-destructive">*</span>
              </Label>
              <Input
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="Rue, repère, numéro de maison..."
                className="h-9 text-sm"
              />
            </div>

            {/* Distance & pricing info */}
            {!isInternational && distanceInfo && city && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Calcul de distance</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Distance max</p>
                    <p className="text-lg font-bold text-primary">{distanceInfo.maxDistance} km</p>
                    {distanceInfo.hasMultiple && (
                      <p className="text-[10px] text-muted-foreground">vers {distanceInfo.furthestSeller}</p>
                    )}
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Frais livraison</p>
                    <p className="text-lg font-bold text-primary">{formatPrice(currentPrice)}</p>
                    <p className="text-[10px] text-muted-foreground">Tarif réel selon la distance</p>
                  </div>
                </div>
                {distanceInfo.hasMultiple && distanceInfo.minDistance !== distanceInfo.maxDistance && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Fournisseur le plus proche : {distanceInfo.closestSeller} ({distanceInfo.minDistance} km). Le tarif est basé sur la distance la plus longue.
                  </p>
                )}
              </div>
            )}

            {!isInternational && city && !distanceInfo && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
                Localisation du fournisseur non disponible. Un tarif standard sera appliqué.
              </div>
            )}

            {/* Interactive Map */}
            {!isInternational && city && (
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="relative">
                  <div style={{ height: 240 }}>
                    <MapContainer
                      center={markerPos || (buyerZone ? [buyerZone.lat, buyerZone.lng] : [6.1375, 1.2123])}
                      zoom={12}
                      style={{ height: "100%", width: "100%" }}
                      scrollWheelZoom={true}
                      key={`${markerPos?.[0] || buyerZone?.lat}-${markerPos?.[1] || buyerZone?.lng}`}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker
                        position={markerPos || (buyerZone ? [buyerZone.lat, buyerZone.lng] : [6.1375, 1.2123])}
                        draggable={true}
                        ref={markerRef}
                        eventHandlers={{
                          dragend: () => {
                            const marker = markerRef.current;
                            if (marker) {
                              const pos = marker.getLatLng();
                              handleMarkerDrag(pos.lat, pos.lng);
                            }
                          },
                        }}
                      >
                        <Popup>
                          📍 {city}{quarter ? `, ${quarter}` : ""}<br />
                          <span className="text-[10px]">Déplacez le marqueur pour changer la zone</span>
                        </Popup>
                      </Marker>
                      {/* Seller markers */}
                      {sellerLocations.filter(s => s.zone).map((sl, i) => (
                        <Marker
                          key={`seller-${i}`}
                          position={[sl.zone!.lat, sl.zone!.lng]}
                        >
                          <Popup>🏪 {sl.name}</Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                  <div className="absolute bottom-2 left-2 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm pointer-events-none">
                    <Navigation className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-medium text-foreground">
                      📍 {city}{quarter ? `, ${quarter}` : ""} — Déplacez le marqueur
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryZoneMap;
