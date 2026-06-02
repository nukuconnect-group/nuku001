/**
 * Estimate delivery distance & fee for the internal Nukuconnect fleet.
 * Barème simple : base 500 FCFA + 100 FCFA / km, plafonné entre 500 et 5000.
 */

export const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const calculateDeliveryFee = (distanceKm: number): number => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 500;
  const raw = 500 + Math.round(distanceKm) * 100;
  return Math.max(500, Math.min(5000, raw));
};

export const estimateDelivery = (
  origin?: { lat?: number | null; lng?: number | null } | null,
  destination?: { lat?: number | null; lng?: number | null } | null
): { distanceKm: number | null; fee: number | null } => {
  if (
    !origin?.lat || !origin?.lng ||
    !destination?.lat || !destination?.lng
  ) return { distanceKm: null, fee: null };
  const distanceKm = haversineKm(
    { lat: Number(origin.lat), lng: Number(origin.lng) },
    { lat: Number(destination.lat), lng: Number(destination.lng) }
  );
  return { distanceKm, fee: calculateDeliveryFee(distanceKm) };
};
