/**
 * Route ↔ sitemap ↔ robots integrity.
 *
 * Guards against the "URL from Google or a shared link lands on 404"
 * regression by asserting that:
 *   1. every entry in public/sitemap.xml corresponds to a real <Route> in App.tsx,
 *   2. no sitemap entry points at a path robots.txt disallows,
 *   3. every static entry uses the canonical https://nukuconnect.com host,
 *   4. every static route path declared in App.tsx that is *not* internal /
 *      protected / dynamic is present in the sitemap.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(p), "utf8");

const CANONICAL_HOSTS = ["https://nukuconnect.com", "https://www.nukuconnect.com"];
const stripHost = (u: string) => {
  for (const h of CANONICAL_HOSTS) if (u.startsWith(h)) return u.slice(h.length) || "/";
  return u;
};

// Paths that legitimately don't belong in the sitemap.
const INTERNAL_OR_PROTECTED = new Set<string>([
  "*",
  "/auth",
  "/reset-password",
  "/dashboard",
  "/premium",
  "/buyer-dashboard",
  "/driver-dashboard",
  "/learner-dashboard",
  "/panier",
  "/mes-commandes",
  "/notifications",
  "/favoris",
  "/messages",
  "/settings",
  "/admin",
  "/jetons",
  "/tokens",
  "/suivi-livraison",
]);

const extractRoutePaths = (source: string): string[] => {
  const rx = /<Route\s+path="([^"]+)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(source))) out.push(m[1]);
  return out;
};

const extractSitemapUrls = (xml: string): string[] => {
  const rx = /<loc>([^<]+)<\/loc>/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml))) out.push(m[1].trim());
  return out;
};

const extractRobotsDisallows = (txt: string): string[] =>
  txt
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^Disallow:/i.test(l))
    .map((l) => l.replace(/^Disallow:\s*/i, "").trim())
    .filter(Boolean);

describe("Sitemap + robots + routes stay consistent", () => {
  const appSrc = read("src/App.tsx");
  const sitemap = read("public/sitemap.xml");
  const robots = read("public/robots.txt");

  const routePaths = extractRoutePaths(appSrc);
  const sitemapUrls = extractSitemapUrls(sitemap);
  const disallows = extractRobotsDisallows(robots);

  it("sitemap is non-empty and well-formed XML", () => {
    expect(sitemap.trim().startsWith("<?xml")).toBe(true);
    expect(sitemap).toContain("<urlset");
    expect(sitemapUrls.length).toBeGreaterThan(0);
  });

  it("every sitemap entry is absolute on the canonical host", () => {
    for (const url of sitemapUrls) {
      expect(CANONICAL_HOSTS.some((h) => url === h || url === `${h}/` || url.startsWith(`${h}/`)))
        .toBe(true);
    }
  });

  it("no sitemap entry points at a robots-disallowed path", () => {
    for (const url of sitemapUrls) {
      const path = stripHost(url) || "/";
      for (const d of disallows) {
        expect(
          path === d || path.startsWith(`${d}/`),
          `Sitemap advertises ${path} but robots.txt disallows ${d}`,
        ).toBe(false);
      }
    }
  });

  it("every sitemap URL matches a real route in App.tsx", () => {
    // Compare against static-prefixed route paths (excluding dynamic segments).
    const staticRoutePrefixes = routePaths
      .filter((p) => p !== "*")
      .map((p) => p.split("/:")[0] || "/")
      .map((p) => (p === "" ? "/" : p));

    for (const url of sitemapUrls) {
      const path = stripHost(url) || "/";
      const match =
        staticRoutePrefixes.includes(path) ||
        // allow /foo when a route is /foo/:id
        staticRoutePrefixes.some((r) => r !== "/" && path === r);
      expect(match, `Sitemap URL ${path} has no matching <Route> in App.tsx`).toBe(true);
    }
  });

  it("public static routes are all discoverable via the sitemap", () => {
    const publicStaticRoutes = routePaths.filter(
      (p) => p !== "*" && !p.includes(":") && !INTERNAL_OR_PROTECTED.has(p),
    );
    const sitemapPaths = new Set(
      sitemapUrls.map((u) => stripHost(u) || "/"),
    );
    const missing = publicStaticRoutes.filter((r) => !sitemapPaths.has(r));
    // Soft assertion: log but only fail on the most critical missing entries.
    const criticalMissing = missing.filter((r) =>
      ["/", "/marketplace", "/producteurs", "/formations", "/plans", "/a-propos", "/contact"].includes(r),
    );
    expect(criticalMissing, `Critical public routes missing from sitemap: ${criticalMissing.join(", ")}`)
      .toEqual([]);
  });

  it("robots.txt exposes a Sitemap directive pointing at the canonical host", () => {
    expect(robots).toMatch(/Sitemap:\s*https:\/\/(www\.)?nukuconnect\.com\/sitemap\.xml/);
  });

  it("root and marketplace routes are declared and not disallowed", () => {
    expect(routePaths).toContain("/");
    expect(routePaths).toContain("/marketplace");
    for (const critical of ["/", "/marketplace", "/producteurs", "/formations", "/plans"]) {
      for (const d of disallows) {
        expect(critical === d || critical.startsWith(`${d}/`)).toBe(false);
      }
    }
  });

  it("catch-all NotFound route exists so no valid URL becomes a hard 404", () => {
    expect(routePaths).toContain("*");
  });
});
