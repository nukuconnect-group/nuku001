/**
 * Build public, user-facing share URLs.
 *
 * Shared links must always show the NukuConnect domain to buyers and suppliers.
 * The `share-og` Edge Function remains available for diagnostics/crawlers, but
 * links copied or sent by users should be canonical `https://nukuconnect.com/...` URLs.
 */
export const SITE_URL = "https://nukuconnect.com";
export const DEFAULT_SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const cleanSegment = (value: string) => encodeURIComponent(value.trim());

export function productCanonicalUrl(idOrSlug: string): string {
  const safe = idOrSlug.trim();
  return safe ? `${SITE_URL}/produit/${cleanSegment(safe)}` : SITE_URL;
}

export function shopCanonicalUrl(businessNameOrFull: string): string {
  const safe = businessNameOrFull.trim();
  return safe ? `${SITE_URL}/producteurs/${cleanSegment(safe)}` : `${SITE_URL}/producteurs`;
}

/** Build product share URL using its slug or id. */
export function productShareUrl(idOrSlug: string): string {
  return productCanonicalUrl(idOrSlug);
}

const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Build shop share URL using profile id first, with business name as fallback. */
export function shopShareUrl(businessNameOrFull: string, profileId?: string | null): string {
  const safe = businessNameOrFull.trim();
  if (safe) return shopCanonicalUrl(safe);
  return isUuid(profileId) ? shopCanonicalUrl(profileId!) : `${SITE_URL}/producteurs`;
}
