/**
 * Returns a URL that serves the given image with the Nukuconnect
 * watermark burned into the pixel data.
 *
 * Falls through (returns the original URL) for empty values, data:
 * URIs, blob: URLs and local /assets paths so we never break previews
 * or fallbacks.
 */
const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/watermark-image`;

function detectFormat(src: string): "png" | "webp" | "jpeg" | null {
  const lower = src.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  return null;
}

export function watermarked(src: string | undefined | null): string {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (src.startsWith("/")) return src;
  if (!/^https?:\/\//i.test(src)) return src;
  const fmt = detectFormat(src);
  const formatParam = fmt ? `&format=${fmt}` : "";
  return `${FN_BASE}?url=${encodeURIComponent(src)}${formatParam}`;
}

/**
 * Fire-and-forget pre-generation: requests the watermarked URL with
 * `keepalive` so the proxy warms its CDN cache. Safe to call from
 * product create/edit flows — failures are silently ignored.
 */
export function prewarmWatermarks(srcs: Array<string | undefined | null>): void {
  if (typeof fetch === "undefined") return;
  const unique = Array.from(new Set(srcs.filter(Boolean) as string[]));
  for (const src of unique) {
    const url = watermarked(src);
    if (!url || url === src) continue;
    try {
      fetch(url, { method: "GET", mode: "no-cors", keepalive: true }).catch(() => {});
    } catch {
      /* ignore */
    }
  }
}
