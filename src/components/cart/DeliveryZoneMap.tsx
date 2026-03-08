import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Store, Package, MapPin, Navigation } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const deliveryOptions = [
  { id: "pickup", name: "Retrait sur place", description: "Récupérez chez le fournisseur", price: 0, icon: Store, tag: "Gratuit" },
  { id: "gozem", name: "Gozem Livraison", description: "Livraison nationale (Togo)", price: 1500, icon: Truck, tag: "National" },
  { id: "standard", name: "Livraison Standard", description: "3-5 jours ouvrables", price: 2500, icon: Package, tag: "Économique" },
  { id: "dhl", name: "DHL Express", description: "International - 2-5 jours", price: 15000, icon: Package, tag: "International" },
];

export { deliveryOptions };

const togoZones = [
  { id: "lome", name: "Lomé", coords: "6.1375,1.2123" },
  { id: "kara", name: "Kara", coords: "9.5511,1.1861" },
  { id: "sokode", name: "Sokodé", coords: "8.9833,1.1333" },
  { id: "atakpame", name: "Atakpamé", coords: "7.5333,1.1333" },
  { id: "kpalime", name: "Kpalimé", coords: "6.9000,0.6333" },
  { id: "dapaong", name: "Dapaong", coords: "10.8625,0.2075" },
  { id: "tsevie", name: "Tsévié", coords: "6.4333,1.2167" },
  { id: "aneho", name: "Aného", coords: "6.2333,1.6000" },
];

interface DeliveryZoneMapProps {
  deliveryMethod: string;
  onDeliveryMethodChange: (method: string) => void;
  city: string;
  onCityChange: (city: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
  quarter: string;
  onQuarterChange: (quarter: string) => void;
}

const DeliveryZoneMap = ({
  deliveryMethod, onDeliveryMethodChange,
  city, onCityChange, address, onAddressChange,
  quarter, onQuarterChange
}: DeliveryZoneMapProps) => {
  const { t, formatPrice } = useLanguage();
  const selectedZone = togoZones.find(z => z.name === city);

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
            {deliveryOptions.map((option) => (
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
                  {option.price === 0 ? "Gratuit" : formatPrice(option.price)}
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

            {/* Map preview */}
            {city && (
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="relative">
                  <iframe
                    title="Carte de livraison"
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      selectedZone
                        ? `${parseFloat(selectedZone.coords.split(",")[1]) - 0.05},${parseFloat(selectedZone.coords.split(",")[0]) - 0.03},${parseFloat(selectedZone.coords.split(",")[1]) + 0.05},${parseFloat(selectedZone.coords.split(",")[0]) + 0.03}`
                        : "1.1,6.1,1.4,6.3"
                    }&layer=mapnik&marker=${selectedZone?.coords || "6.1375,1.2123"}`}
                  />
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                    <Navigation className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-medium text-foreground">
                      {city}{quarter ? `, ${quarter}` : ""}
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
