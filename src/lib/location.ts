/**
 * Unified location parsing utility for consistent display across all profiles
 * (producers, buyers, experts, drivers).
 */

export interface ParsedLocation {
  /** Raw input (trimmed) */
  raw: string;
  /** City portion (first comma-separated segment) */
  city: string;
  /** Country portion (second segment, or guessed default) */
  country: string;
  /** Best display string: "City, Country" or fallback */
  display: string;
  /** Country flag emoji */
  flag: string;
  /** True if we had to use a fallback (no real data) */
  isFallback: boolean;
}

const FLAG_MAP: Array<{ test: RegExp; flag: string }> = [
  { test: /ghana/i, flag: "🇬🇭" },
  { test: /b[ée]nin/i, flag: "🇧🇯" },
  { test: /ivoire|c[oô]te.?d.?ivoire|ivory/i, flag: "🇨🇮" },
  { test: /s[ée]n[ée]gal/i, flag: "🇸🇳" },
  { test: /burkina/i, flag: "🇧🇫" },
  { test: /mali/i, flag: "🇲🇱" },
  { test: /niger/i, flag: "🇳🇪" },
  { test: /nigeria/i, flag: "🇳🇬" },
  { test: /togo/i, flag: "🇹🇬" },
];

const FALLBACK_COUNTRY = "Togo";
const FALLBACK_FLAG = "🇹🇬";
const FALLBACK_LABEL = "Localisation à confirmer";

export function parseLocation(input?: string | null): ParsedLocation {
  const raw = (input || "").trim();
  if (!raw) {
    return {
      raw: "",
      city: "",
      country: FALLBACK_COUNTRY,
      display: FALLBACK_LABEL,
      flag: FALLBACK_FLAG,
      isFallback: true,
    };
  }
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const city = parts[0] || "";
  let country = parts[1] || "";

  // Guess country from city if missing
  if (!country) {
    const matched = FLAG_MAP.find((f) => f.test.test(raw));
    country = matched ? raw.match(matched.test)?.[0] || FALLBACK_COUNTRY : FALLBACK_COUNTRY;
  }

  const flagEntry = FLAG_MAP.find((f) => f.test.test(country)) ||
                    FLAG_MAP.find((f) => f.test.test(raw));
  const flag = flagEntry?.flag || FALLBACK_FLAG;

  const display = city && country
    ? `${city}, ${country}`
    : city || country || FALLBACK_LABEL;

  return { raw, city, country, display, flag, isFallback: false };
}

/**
 * Build a Google Maps directions URL.
 * Uses lat/lng if provided, otherwise falls back to the text destination.
 * If origin coords are provided, the route starts there; otherwise Maps uses user location.
 */
export function buildDirectionsUrl(opts: {
  destLat?: number | null;
  destLng?: number | null;
  destText?: string | null;
  originLat?: number | null;
  originLng?: number | null;
}): string {
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams();
  if (opts.destLat != null && opts.destLng != null) {
    params.set("destination", `${opts.destLat},${opts.destLng}`);
  } else if (opts.destText) {
    params.set("destination", opts.destText);
  } else {
    params.set("destination", FALLBACK_COUNTRY);
  }
  if (opts.originLat != null && opts.originLng != null) {
    params.set("origin", `${opts.originLat},${opts.originLng}`);
  }
  return `${base}&${params.toString()}`;
}

/**
 * Format a relative "last seen" / "online" indicator for a profile.
 * Returns { label, isOnline } based on a last-active timestamp.
 */
export function formatPresence(lastActiveAt?: string | Date | null): {
  label: string;
  isOnline: boolean;
} {
  if (!lastActiveAt) return { label: "Hors ligne", isOnline: false };
  const d = typeof lastActiveAt === "string" ? new Date(lastActiveAt) : lastActiveAt;
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 5) return { label: "En ligne", isOnline: true };
  if (min < 60) return { label: `Vu il y a ${min} min`, isOnline: false };
  const h = Math.floor(min / 60);
  if (h < 24) return { label: `Vu il y a ${h} h`, isOnline: false };
  const days = Math.floor(h / 24);
  if (days < 30) return { label: `Vu il y a ${days} j`, isOnline: false };
  return { label: "Hors ligne", isOnline: false };
}
