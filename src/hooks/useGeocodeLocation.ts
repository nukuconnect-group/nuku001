import { useQuery } from "@tanstack/react-query";

const cache = new Map<string, [number, number] | null>();

/** Forward-geocode a free-text location via OpenStreetMap Nominatim.
 *  Returns [lat, lng] when found, or null. Cached in-memory + localStorage. */
export function useGeocodeLocation(location?: string | null) {
  return useQuery({
    queryKey: ["geocode", location],
    enabled: !!location && location.trim().length > 1,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<[number, number] | null> => {
      const key = (location || "").trim().toLowerCase();
      if (cache.has(key)) return cache.get(key)!;
      const lsKey = `geo:${key}`;
      try {
        const stored = localStorage.getItem(lsKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length === 2) {
            cache.set(key, parsed as [number, number]);
            return parsed as [number, number];
          }
        }
      } catch {}
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(key)}&format=json&limit=1&accept-language=fr`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(`Nominatim ${res.status}`);
        const arr = await res.json();
        if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
          const coords: [number, number] = [parseFloat(arr[0].lat), parseFloat(arr[0].lon)];
          cache.set(key, coords);
          try { localStorage.setItem(lsKey, JSON.stringify(coords)); } catch {}
          return coords;
        }
      } catch (e) {
        console.warn("[geocode] failed", e);
      }
      cache.set(key, null);
      return null;
    },
  });
}
