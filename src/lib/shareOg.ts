/**
 * Build a crawler-friendly share URL that hits the `share-og` edge function.
 * The function returns OG/Twitter meta for social crawlers and redirects real
 * users to the canonical SPA page on www.nukuconnect.com.
 *
 * Why: we are a Vite SPA, so per-route meta injected by react-helmet is
 * invisible to WhatsApp / Facebook / LinkedIn / Telegram / X crawlers — they
 * only see index.html. Using this URL when sharing fixes the preview while
 * keeping the canonical SPA route as the human-visible landing page.
 */
const PROJECT_REF = "fpnhdihvnfsiymopbjgt";
const BASE = `https://${PROJECT_REF}.functions.supabase.co/share-og`;

export function productShareUrl(idOrSlug: string): string {
  return `${BASE}?type=product&id=${encodeURIComponent(idOrSlug)}`;
}

export function shopShareUrl(businessNameOrFull: string): string {
  return `${BASE}?type=shop&name=${encodeURIComponent(businessNameOrFull)}`;
}
