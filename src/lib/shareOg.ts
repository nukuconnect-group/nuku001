/**
 * Build a clean, SEO-friendly share URL on the canonical site domain.
 *
 * We intentionally NO LONGER point share buttons at the supabase functions
 * domain — production share links must show `https://nukuconnect.com/...`.
 *
 * The per-route SEO component (`src/components/SEO.tsx`) injects the
 * appropriate <title>, <meta name="description">, og:* and twitter:*
 * tags for route-level SEO and any crawler/browser that evaluates the app.
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

/** Build shop share URL using business name (or full name fallback). */
export function shopShareUrl(businessNameOrFull: string): string {
  const safe = businessNameOrFull.trim();
  return safe ? `${SHARE_OG_BASE}?type=shop&name=${cleanSegment(safe)}&v=${SHARE_CACHE_VERSION}` : `${SITE_URL}/producteurs`;
}
