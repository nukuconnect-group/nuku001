import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import {
  haversineKm,
  formatDistanceKm,
  readCachedUserGeo,
  writeCachedUserGeo,
} from "@/lib/geo";

interface Props {
  productLat: number | null;
  productLng: number | null;
  location?: string | null;
}

const ProductDistance = ({ productLat, productLng, location }: Props) => {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (productLat == null || productLng == null) return;

    // 1. Try cached geolocation first (avoids repeated permission prompts)
    const cached = readCachedUserGeo();
    if (cached) {
      setDistance(haversineKm(cached.lat, cached.lng, productLat, productLng));
      return;
    }

    // 2. Fall back to a fresh permission request
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        writeCachedUserGeo({ lat: latitude, lng: longitude });
        setDistance(haversineKm(latitude, longitude, productLat, productLng));
      },
      () => {
        /* permission denied or unavailable — silently fall back to city label */
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 3600 * 1000 }
    );
  }, [productLat, productLng]);

  // Fallback: no product coords OR no user coords → show textual city (Section 5)
  if (distance == null) {
    return location ? (
      <div className="flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground truncate">{location}</span>
      </div>
    ) : null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
      <span className="text-muted-foreground">
        À <span className="text-foreground font-semibold">{formatDistanceKm(distance)}</span> de vous
      </span>
    </div>
  );
};

export default ProductDistance;
