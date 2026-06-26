/**
 * Build share URLs for NukuConnect.
 *
 * Two flavours, both needed:
 *
 *  - `productCanonicalUrl` / `shopCanonicalUrl` → clean
 *    `https://nukuconnect.com/...` links. Used everywhere a HUMAN sees
 *    the URL (copy button, QR code, address bar of the dialog).
 *
 *  - `productCrawlerUrl` / `shopCrawlerUrl` → public `/share/...`
 *    URLs on nukuconnect.com, reverse-proxied to the `share-og`
 *    renderer. They return proper Open Graph / Twitter Card HTML
 *    (title + description + cover image) so WhatsApp, Facebook,
 *    LinkedIn and Telegram render a rich preview without exposing a
 *    backend URL to users.
 *
 * The SPA hosted on nukuconnect.com cannot serve per-product OG tags
 * because social crawlers don't execute JS, so the crawler URL is the
 * only reliable way to restore link previews on chat / social apps.
 */

export const SITE_URL = "https://nukuconnect.com";
export const DEFAULT_SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const SHARE_OG_BASE = `${import.meta.env.VITE_SUPABASE_URL || "https://fpnhdihvnfsiymopbjgt.supabase.co"}/functions/v1/share-og`;

const cleanSegment = (value: string) => encodeURIComponent(value.trim());

const normalizeSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const publicOgPath = (type: "product" | "shop", id: string, name?: string | null) => {
  const slug = normalizeSlug(name || id) || type;
  const params = new URLSearchParams({ type, id, source: "share" });
  if (name?.trim() && name.trim() !== id) params.set("name", name.trim());
  return `${SITE_URL}/share/${type}/${slug}?${params.toString()}`;
};

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
  return `${publicOgPath("product", safe)}&v=${cacheBust()}`;
}

/**
 * URL fed to crawlers for a supplier / shop profile.
 * Prefers profile UUID to avoid name-collision lookups.
 */
export function shopCrawlerUrl(businessNameOrFull: string, profileId?: string | null): string {
  const id = isUuid(profileId) ? profileId! : businessNameOrFull.trim();
  if (!id) return SITE_URL;
  return `${publicOgPath("shop", id, businessNameOrFull)}&v=${cacheBust()}`;
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
