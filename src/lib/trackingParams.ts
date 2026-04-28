// Centralised list of query params we strip from the URL bar
// to avoid duplicate-content / dirty-canonical issues in Google.
//
// IMPORTANT: `ref` is intentionally PRESERVED — it's used by the
// affiliation program (/affiliation?ref=CODE) to attribute commissions.

export const TRACKING_PARAMS: readonly string[] = [
  // Google ecosystem
  "srsltid",   // Google Merchant / Shopping
  "gclid",     // Google Ads
  "gbraid",
  "wbraid",
  "dclid",     // DoubleClick
  "_ga",
  "_gl",

  // Meta / Facebook
  "fbclid",

  // Microsoft / Bing
  "msclkid",
  "msutm",

  // Other ad networks
  "yclid",     // Yandex
  "ttclid",    // TikTok
  "li_fat_id", // LinkedIn
  "twclid",    // Twitter/X

  // Email marketing
  "mc_cid",
  "mc_eid",
  "vero_id",
  "oly_anon_id",
  "oly_enc_id",
  "_hsenc",
  "_hsmi",
  "hsCtaTracking",

  // Generic affiliate (NOT `ref` — that one is used by Nukuconnect's affiliation flow)
  "aff",
  "affid",
  "affiliate",
];

const TRACKING_SET = new Set(TRACKING_PARAMS);

/** True if the param name should be stripped from the URL. */
export const isTrackingParam = (name: string): boolean => {
  if (TRACKING_SET.has(name)) return true;
  // All utm_* variants
  if (name.toLowerCase().startsWith("utm_")) return true;
  return false;
};

/**
 * Returns a new URL string with all known tracking params removed.
 * Preserves the path, hash, and any non-tracking query params.
 */
export const stripTrackingFromUrl = (input: string | URL): string => {
  const url = typeof input === "string" ? new URL(input, "http://_") : new URL(input.toString());
  const toDelete: string[] = [];
  url.searchParams.forEach((_v, k) => {
    if (isTrackingParam(k)) toDelete.push(k);
  });
  toDelete.forEach((k) => url.searchParams.delete(k));
  const qs = url.searchParams.toString();
  return url.pathname + (qs ? `?${qs}` : "") + url.hash;
};

/** List the tracking params currently present in a URL (for debugging / admin UI). */
export const listTrackingParams = (input: string | URL): string[] => {
  const url = typeof input === "string" ? new URL(input, "http://_") : new URL(input.toString());
  const found: string[] = [];
  url.searchParams.forEach((_v, k) => {
    if (isTrackingParam(k)) found.push(k);
  });
  return found;
};

/**
 * Build a clean canonical path from any URL: drops ALL query params and the hash.
 * Search engines should consolidate signals on this path.
 */
export const buildCanonicalPath = (input: string | URL): string => {
  const url = typeof input === "string" ? new URL(input, "http://_") : new URL(input.toString());
  return url.pathname || "/";
};
