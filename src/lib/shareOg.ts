/**
 * Build share URLs for NukuConnect.
 *
 *  - `productCanonicalUrl` / `shopCanonicalUrl` → clean
 *    `https://nukuconnect.com/...` links. Used for the on-page canonical
 *    tag, the address bar, and any "View" link that a HUMAN will click.
 *
 *  - `productCrawlerUrl` / `shopCrawlerUrl` → the URL we hand to social
 *    unfurlers (WhatsApp / Facebook / LinkedIn / Telegram / X) AND the
 *    URL we place in the clipboard / QR code, because when a user pastes
 *    a link in WhatsApp the app fetches whatever URL it sees. This must
 *    resolve to per-item OG HTML — otherwise crawlers get the SPA
 *    `index.html` with the generic homepage preview.
 *
 *    The Lovable static host does NOT process `public/_redirects`
 *    (Netlify-only convention), so a `nukuconnect.com/share/...` URL is
 *    served as the SPA shell with the generic OG tags — that's the
 *    "homepage logo" preview bug reported on WhatsApp. Point the
 *    crawler URL directly at the Supabase edge function instead; the
 *    function replies with proper `og:*` HTML plus a
 *    `<meta http-equiv="refresh">` back to the canonical page so a real
 *    user who clicks the shared link lands on `/produit/...` or
 *    `/producteurs/...` a second later.
 */

export const SITE_URL = "https://nukuconnect.com";
export const DEFAULT_SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const SHARE_OG_BASE = `${import.meta.env.VITE_SUPABASE_URL || "https://fpnhdihvnfsiymopbjgt.supabase.co"}/functions/v1/share-og`;

const cleanSegment = (value: string) => encodeURIComponent(value.trim());

const edgeOgUrl = (type: "product" | "shop", id: string, name?: string | null) => {
  const params = new URLSearchParams({ type, id, source: "share" });
  if (name?.trim() && name.trim() !== id) params.set("name", name.trim());
  return `${SHARE_OG_BASE}?${params.toString()}`;
};


/* --------------------- Canonical (human-facing) URLs --------------------- */

export function productCanonicalUrl(idOrSlug: string): string {
  const safe = idOrSlug.trim();
  return safe ? `${SITE_URL}/produit/${cleanSegment(safe)}` : SITE_URL;
}

export function shopCanonicalUrl(businessNameOrFull: string): string {
  const safe = businessNameOrFull.trim();
  return safe ? `${SITE_URL}/producteurs/${cleanSegment(safe)}` : `${SITE_URL}/producteurs`;
}

/** Clean URL shown to users (copy / QR / address bar). */
export function productShareUrl(idOrSlug: string): string {
  return productCanonicalUrl(idOrSlug);
}

const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Clean shop URL shown to users (copy / QR / address bar). */
export function shopShareUrl(businessNameOrFull: string, profileId?: string | null): string {
  const safe = businessNameOrFull.trim();
  if (safe) return shopCanonicalUrl(safe);
  return isUuid(profileId) ? shopCanonicalUrl(profileId!) : `${SITE_URL}/producteurs`;
}

/* --------------------- Crawler URLs (rich previews) --------------------- */

const cacheBust = () => Math.random().toString(36).slice(2, 10);

/**
 * URL fed to WhatsApp / Facebook / LinkedIn / Telegram link unfurlers.
 * Returns OG/Twitter HTML with the product's image, title, description.
 */
export function productCrawlerUrl(idOrSlug: string): string {
  const safe = idOrSlug.trim();
  if (!safe) return SITE_URL;
  return `${edgeOgUrl("product", safe)}&v=${cacheBust()}`;
}

/**
 * URL fed to crawlers for a supplier / shop profile.
 * Prefers profile UUID to avoid name-collision lookups.
 */
export function shopCrawlerUrl(businessNameOrFull: string, profileId?: string | null): string {
  const id = isUuid(profileId) ? profileId! : businessNameOrFull.trim();
  if (!id) return SITE_URL;
  return `${edgeOgUrl("shop", id, businessNameOrFull)}&v=${cacheBust()}`;
}

/** Direct backend endpoint kept only for diagnostics/admin tools. */
export function productEdgeCrawlerUrl(idOrSlug: string): string {
  const safe = idOrSlug.trim();
  if (!safe) return SITE_URL;
  return `${SHARE_OG_BASE}?type=product&id=${cleanSegment(safe)}&v=${cacheBust()}`;
}

/** Direct backend endpoint kept only for diagnostics/admin tools. */
export function shopEdgeCrawlerUrl(businessNameOrFull: string, profileId?: string | null): string {
  const id = isUuid(profileId) ? profileId! : businessNameOrFull.trim();
  if (!id) return SITE_URL;
  const nameParam = businessNameOrFull.trim() && businessNameOrFull.trim() !== id
    ? `&name=${cleanSegment(businessNameOrFull)}`
    : "";
  return `${SHARE_OG_BASE}?type=shop&id=${cleanSegment(id)}${nameParam}&v=${cacheBust()}`;
}
