/**
 * Returns a URL that serves the given image with the Nukuconnect
 * watermark burned into the pixel data. Because the watermark is part
 * of the image itself, it remains visible after download, screenshot,
 * zoom, sharing — anything.
 *
 * Falls through (returns the original URL) for empty values, data:
 * URIs, blob: URLs and local /assets paths so we never break previews
 * or fallbacks.
 */
const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/watermark-image`;

export function watermarked(src: string | undefined | null): string {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  // Local public assets (placeholder, fallback) shouldn't go through the proxy
  if (src.startsWith("/")) return src;
  if (!/^https?:\/\//i.test(src)) return src;
  return `${FN_BASE}?url=${encodeURIComponent(src)}`;
}
