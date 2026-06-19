/**
 * Build a clean, SEO-friendly share URL on the canonical site domain.
 *
 * We intentionally NO LONGER point share buttons at the supabase functions
 * domain — production share links must show `https://www.nukuconnect.com/...`.
 *
 * The per-route SEO component (`src/components/SEO.tsx`) injects the
 * appropriate <title>, <meta name="description">, og:* and twitter:*
 * tags via react-helmet-async, so JS-aware crawlers + Google see the full
 * product/shop preview when scraping these URLs.
 */
const SITE = "https://www.nukuconnect.com";

/** Build product share URL using its slug or id. */
export function productShareUrl(idOrSlug: string): string {
  return `${SITE}/produit/${encodeURIComponent(idOrSlug)}`;
}

/** Build shop share URL using business name (or full name fallback). */
export function shopShareUrl(businessNameOrFull: string): string {
  return `${SITE}/producteurs/${encodeURIComponent(businessNameOrFull)}`;
}
