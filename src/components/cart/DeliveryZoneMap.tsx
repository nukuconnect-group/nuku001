import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Store, Package, MapPin, Navigation, Ruler, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "./CartContext";

// Zones with lat/lng coordinates
const togoZones = [
  { id: "lome", name: "Lomé", lat: 6.1375, lng: 1.2123 },
  { id: "kara", name: "Kara", lat: 9.5511, lng: 1.1861 },
  { id: "sokode", name: "Sokodé", lat: 8.9833, lng: 1.1333 },
  { id: "atakpame", name: "Atakpamé", lat: 7.5333, lng: 1.1333 },
  { id: "kpalime", name: "Kpalimé", lat: 6.9000, lng: 0.6333 },
  { id: "dapaong", name: "Dapaong", lat: 10.8625, lng: 0.2075 },
  { id: "tsevie", name: "Tsévié", lat: 6.4333, lng: 1.2167 },
  { id: "aneho", name: "Aného", lat: 6.2333, lng: 1.6000 },
  { id: "lome-port", name: "Lomé (Port)", lat: 6.1319, lng: 1.2850 },
  { id: "notse", name: "Notsé", lat: 6.9500, lng: 1.1667 },
  { id: "bassar", name: "Bassar", lat: 9.2500, lng: 0.7833 },
  { id: "mango", name: "Mango", lat: 10.3667, lng: 0.4667 },
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

// Pricing tiers based on distance
function getDeliveryPriceByDistance(distanceKm: number): { price: number; tier: string } {
  if (distanceKm <= 10) return { price: 500, tier: "Proximité (< 10 km)" };
  if (distanceKm <= 30) return { price: 1000, tier: "Zone urbaine (< 30 km)" };
  if (distanceKm <= 80) return { price: 1500, tier: "Zone régionale (< 80 km)" };
  if (distanceKm <= 200) return { price: 2500, tier: "Inter-régional (< 200 km)" };
  if (distanceKm <= 400) return { price: 4000, tier: "Longue distance (< 400 km)" };
  return { price: 6000, tier: "Très longue distance (> 400 km)" };
}

// Base delivery options (pickup has fixed 0, others are distance-based)
const baseDeliveryOptions = [
  { id: "pickup", name: "Retrait sur place", description: "Récupérez chez le fournisseur", icon: Store, tag: "Gratuit", fixed: true, fixedPrice: 0 },
  { id: "gozem", name: "Gozem Livraison", description: "Livraison rapide moto/véhicule", icon: Truck, tag: "Rapide", fixed: false, fixedPrice: 0 },
  { id: "standard", name: "Livraison Standard", description: "3-5 jours ouvrables", icon: Package, tag: "Économique", fixed: false, fixedPrice: 0 },
  { id: "dhl", name: "DHL Express", description: "International - 2-5 jours", icon: Package, tag: "International", fixed: true, fixedPrice: 15000 },
];

// Build delivery options with calculated prices
export function buildDeliveryOptions(distanceKm: number | null) {
  return baseDeliveryOptions.map(opt => {
    if (opt.fixed) return { ...opt, price: opt.fixedPrice };
    if (distanceKm === null) return { ...opt, price: 0 }; // no distance yet
    const { price } = getDeliveryPriceByDistance(distanceKm);
    // Gozem is slightly more expensive (express)
    const multiplier = opt.id === "gozem" ? 1.3 : 1;
    return { ...opt, price: Math.round(price * multiplier / 100) * 100 };
  });
}

// Keep backward-compatible export
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
}

const DeliveryZoneMap = ({
  deliveryMethod, onDeliveryMethodChange,
  city, onCityChange, address, onAddressChange,
  quarter, onQuarterChange, onDynamicPriceChange,
}: DeliveryZoneMapProps) => {
  const { t, formatPrice } = useLanguage();
  const { items } = useCart();

  const buyerZone = togoZones.find(z => z.name === city);

  // Get unique seller locations from cart
  const sellerLocations = useMemo(() => {
    const locs = new Set(items.map(i => i.product.location).filter(Boolean));
    return Array.from(locs).map(loc => {
      const zone = togoZones.find(z => z.name === loc);
      return { name: loc, zone };
    });
  }, [items]);

  // Calculate distance to furthest seller
  const distanceInfo = useMemo(() => {
    if (!buyerZone || sellerLocations.length === 0) return null;
    let maxDist = 0;
    let closestSeller = "";
    let furthestSeller = "";
    let minDist = Infinity;

    for (const sl of sellerLocations) {
      if (!sl.zone) continue;
      const d = calcDistance(buyerZone.lat, buyerZone.lng, sl.zone.lat, sl.zone.lng);
      if (d > maxDist) { maxDist = d; furthestSeller = sl.name; }
      if (d < minDist) { minDist = d; closestSeller = sl.name; }
    }
    return {
      maxDistance: Math.round(maxDist),
      minDistance: Math.round(minDist),
      closestSeller,
      furthestSeller,
      hasMultiple: sellerLocations.length > 1,
    };
  }, [buyerZone, sellerLocations]);

  // Build options with distance-based pricing
  const computedOptions = useMemo(() => {
    return buildDeliveryOptions(distanceInfo?.maxDistance ?? null);
  }, [distanceInfo]);

  // Notify parent of dynamic price changes
  const selectedOption = computedOptions.find(o => o.id === deliveryMethod);
  const currentPrice = selectedOption?.price ?? 0;

  // Use effect-like pattern via memo to notify parent
  useMemo(() => {
    onDynamicPriceChange?.(currentPrice);
  }, [currentPrice, onDynamicPriceChange]);

  // Map bounding box covering buyer + sellers
  const mapSrc = useMemo(() => {
    if (!buyerZone) return null;
    const points = [{ lat: buyerZone.lat, lng: buyerZone.lng }];
    sellerLocations.forEach(sl => {
      if (sl.zone) points.push({ lat: sl.zone.lat, lng: sl.zone.lng });
    });
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const padding = 0.05;
    const minLat = Math.min(...lats) - padding;
    const maxLat = Math.max(...lats) + padding;
    const minLng = Math.min(...lngs) - padding;
    const maxLng = Math.max(...lngs) + padding;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${buyerZone.lat},${buyerZone.lng}`;
  }, [buyerZone, sellerLocations]);

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
                    ? (option.id === "pickup" ? "Gratuit" : "Sélectionnez une ville")
                    : formatPrice(option.price)}
                </span>
              </div>
            ))}
          </div>
        </RadioGroup>

        {/* Delivery address form with map */}
        {deliveryMethod !== "pickup" && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-xl border border-border">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Adresse de livraison
            </h4>
            
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Ville <span className="text-destructive">*</span>
                </Label>
                <Select value={city} onValueChange={onCityChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sélectionner une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {togoZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.name}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quartier</Label>
                <Input
                  value={quarter}
                  onChange={(e) => onQuarterChange(e.target.value)}
                  placeholder="Ex: Bè, Adidogomé..."
                  className="h-9 text-sm"
                />
              </div>
            </div>
            
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
            {distanceInfo && city && (
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
                    <p className="text-[10px] text-muted-foreground">
                      {getDeliveryPriceByDistance(distanceInfo.maxDistance).tier}
                    </p>
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

            {/* No seller location warning */}
            {city && !distanceInfo && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
                Localisation du fournisseur non disponible. Un tarif standard sera appliqué.
              </div>
            )}

            {/* Map preview */}
            {city && (
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="relative">
                  <iframe
                    title="Carte de livraison"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc || `https://www.openstreetmap.org/export/embed.html?bbox=1.0,6.0,1.5,6.4&layer=mapnik&marker=${buyerZone?.lat || 6.1375},${buyerZone?.lng || 1.2123}`}
                  />
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                    <Navigation className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-medium text-foreground">
                      📍 {city}{quarter ? `, ${quarter}` : ""}
                    </span>
                  </div>
                  {sellerLocations.length > 0 && sellerLocations.some(s => s.zone) && (
                    <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm">
                      <span className="text-[10px] font-medium text-foreground">
                        🏪 {sellerLocations.map(s => s.name).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing scale */}
            <div className="text-[10px] text-muted-foreground space-y-1 pt-1">
              <p className="font-semibold text-xs text-foreground mb-1">Grille tarifaire :</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {[
                  { label: "< 10 km", price: 500 },
                  { label: "< 30 km", price: 1000 },
                  { label: "< 80 km", price: 1500 },
                  { label: "< 200 km", price: 2500 },
                  { label: "< 400 km", price: 4000 },
                  { label: "> 400 km", price: 6000 },
                ].map(t => (
                  <div key={t.label} className={`rounded px-2 py-1 ${
                    distanceInfo && getDeliveryPriceByDistance(distanceInfo.maxDistance).price === t.price
                      ? "bg-primary/10 text-primary font-semibold"
                      : "bg-muted"
                  }`}>
                    {t.label} → {formatPrice(t.price)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryZoneMap;
