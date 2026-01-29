import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { MapPin, Leaf, SlidersHorizontal, X } from "lucide-react";
import { categories } from "@/data/marketplace";

interface MarketplaceFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  organicOnly: boolean;
  onOrganicChange: (organic: boolean) => void;
  location: string;
  onLocationChange: (location: string) => void;
  onReset: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const locations = [
  "Toutes les régions",
  "Lomé",
  "Kara",
  "Sokodé",
  "Kpalimé",
  "Atakpamé",
  "Dapaong",
  "Tsévié",
  "Notsé",
];

const MarketplaceFilters = ({
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  organicOnly,
  onOrganicChange,
  location,
  onLocationChange,
  onReset,
  isMobileOpen,
  onMobileClose,
}: MarketplaceFiltersProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toString();
  };

  const FilterContent = () => (
    <>
      {/* Categories */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Catégorie</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "secondary"}
              size="sm"
              onClick={() => onCategoryChange(cat.id)}
              className="text-xs"
            >
              {cat.name}
              <span className="ml-1 opacity-70">({cat.count})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Localisation
        </Label>
        <Select value={location} onValueChange={onLocationChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une région" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">
          Prix (FCFA): {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
        </Label>
        <Slider
          value={priceRange}
          onValueChange={(value) => onPriceRangeChange(value as [number, number])}
          min={0}
          max={500000}
          step={5000}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 FCFA</span>
          <span>500K FCFA</span>
        </div>
      </div>

      {/* Organic Only */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
          <Leaf className="w-4 h-4 text-primary" />
          Produits bio uniquement
        </Label>
        <Switch checked={organicOnly} onCheckedChange={onOrganicChange} />
      </div>

      {/* Reset */}
      <Button variant="outline" onClick={onReset} className="w-full">
        Réinitialiser les filtres
      </Button>
    </>
  );

  // Mobile sidebar
  if (isMobileOpen !== undefined) {
    return (
      <>
        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
            onClick={onMobileClose}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 w-80 bg-card z-50 transform transition-transform duration-300 lg:hidden ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              Filtres
            </h2>
            <button
              onClick={onMobileClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-60px)]">
            <FilterContent />
          </div>
        </div>

        {/* Desktop Sidebar */}
        <Card className="hidden lg:block sticky top-24">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FilterContent />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" />
          Filtres
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FilterContent />
      </CardContent>
    </Card>
  );
};

export default MarketplaceFilters;
