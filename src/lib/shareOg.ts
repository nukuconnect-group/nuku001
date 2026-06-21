/**
 * Build crawler-friendly share URLs.
 *
 * Social crawlers do not execute the React app, so shared product/shop links
 * use the dedicated share-og HTML endpoint, then redirect users to the
 * canonical `https://nukuconnect.com/...` route.
 */
export const SITE_URL = "https://nukuconnect.com";
export const DEFAULT_SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const cleanSegment = (value: string) => encodeURIComponent(value.trim());
const SHARE_OG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-og`;
const SHARE_CACHE_VERSION = Date.now().toString(36);

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
  const safe = idOrSlug.trim();
  return safe ? `${SHARE_OG_BASE}?type=product&id=${cleanSegment(safe)}&v=${SHARE_CACHE_VERSION}` : SITE_URL;
}

const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Build shop share URL using profile id first, with business name as fallback. */
export function shopShareUrl(businessNameOrFull: string, profileId?: string | null): string {
  const safe = businessNameOrFull.trim();
  if (isUuid(profileId)) {
    const nameParam = safe ? `&name=${cleanSegment(safe)}` : "";
    return `${SHARE_OG_BASE}?type=shop&id=${cleanSegment(profileId!)}${nameParam}&v=${SHARE_CACHE_VERSION}`;
  }
  return safe ? `${SHARE_OG_BASE}?type=shop&name=${cleanSegment(safe)}&v=${SHARE_CACHE_VERSION}` : `${SITE_URL}/producteurs`;
}
