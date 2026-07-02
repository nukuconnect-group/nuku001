import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface Props {
  productLat: number | null;
  productLng: number | null;
  location?: string | null;
}

const STORAGE_KEY = "nuku_user_geo_v1";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const ProductDistance = ({ productLat, productLng, location }: Props) => {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (productLat == null || productLng == null) return;
    // Try cached geolocation first (avoid repeated permission prompts)
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (cached?.lat && cached?.lng && Date.now() - (cached.ts || 0) < 24 * 3600 * 1000) {
        setDistance(haversineKm(cached.lat, cached.lng, productLat, productLng));
        return;
      }
    } catch {}

    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lat: latitude, lng: longitude, ts: Date.now() })
          );
        } catch {}
        setDistance(haversineKm(latitude, longitude, productLat, productLng));
      },
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 3600 * 1000 }
    );
  }, [productLat, productLng]);

  if (distance == null) {
    return location ? (
      <div className="flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground truncate">{location}</span>
      </div>
    ) : null;
  }

  const label =
    distance < 1
      ? `${Math.round(distance * 1000)} m`
      : distance < 100
        ? `${distance.toFixed(1)} km`
        : `${Math.round(distance)} km`;

  return (
    <div className="flex items-center gap-1.5">
      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
      <span className="text-muted-foreground">
        À <span className="text-foreground font-semibold">{label}</span> de vous
      </span>
    </div>
  );
};

export default ProductDistance;
