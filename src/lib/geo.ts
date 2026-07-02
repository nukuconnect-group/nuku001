// Utilities for user ↔ product geo-distance calculations.
// Kept pure and side-effect-free so they can be unit-tested easily.

export const USER_GEO_STORAGE_KEY = "nuku_user_geo_v1";
export const USER_GEO_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

export interface CachedGeo {
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Haversine great-circle distance between two lat/lng points, in **kilometres**.
 * Returns 0 when the two points are identical. Throws on non-finite input so the
 * caller doesn't silently render `NaN km`.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    throw new Error("haversineKm: coordinates must be finite numbers");
  }
  const R = 6371; // Earth radius in km (mean radius)
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Format a distance (km) for humans. Short distances → metres, medium → decimal km,
 * long → rounded km. Returns e.g. "450 m", "12.3 km", "1 240 km".
 */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("fr-FR")} km`;
}

/**
 * Read the user's cached geolocation from localStorage. Returns null when the
 * cache is missing, malformed, or older than {@link USER_GEO_TTL_MS}.
 */
export function readCachedUserGeo(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null,
  now: number = Date.now()
): CachedGeo | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(USER_GEO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedGeo> | null;
    if (
      !parsed ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.ts !== "number"
    ) {
      return null;
    }
    if (now - parsed.ts > USER_GEO_TTL_MS) return null;
    return { lat: parsed.lat, lng: parsed.lng, ts: parsed.ts };
  } catch {
    return null;
  }
}

/** Persist the user's geolocation to localStorage. Silently no-ops on quota errors. */
export function writeCachedUserGeo(
  geo: { lat: number; lng: number },
  storage: Pick<Storage, "setItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null,
  now: number = Date.now()
): void {
  if (!storage) return;
  try {
    storage.setItem(
      USER_GEO_STORAGE_KEY,
      JSON.stringify({ lat: geo.lat, lng: geo.lng, ts: now })
    );
  } catch {
    /* quota / privacy mode — ignore */
  }
}
