/**
 * E2E: share-og edge function contract.
 *
 * Guarantees that URLs pasted into WhatsApp / Facebook / LinkedIn always
 * unfurl to per-item OG HTML (never the homepage) and that real users who
 * click the shared link are redirected to the canonical `/produit/...` or
 * `/producteurs/...` route via a `<meta http-equiv="refresh">`.
 *
 * The `SHARE_OG_LIVE=1` env var opts into hitting the deployed edge
 * function; without it we only assert the contract of the URL builders
 * (`productCrawlerUrl` / `shopCrawlerUrl`) so the suite is CI-safe offline.
 */
import { describe, it, expect } from "vitest";
import {
  productCrawlerUrl,
  shopCrawlerUrl,
  productCanonicalUrl,
  shopCanonicalUrl,
  SITE_URL,
} from "@/lib/shareOg";

const EDGE_HOST =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL ||
  "https://fpnhdihvnfsiymopbjgt.supabase.co";

describe("Share URL builders never fall back on the homepage", () => {
  it("productCrawlerUrl targets the share-og edge function, not the SPA shell", () => {
    const url = productCrawlerUrl("abc-123");
    expect(url).toContain(`${EDGE_HOST}/functions/v1/share-og`);
    expect(url).toContain("type=product");
    expect(url).toContain("id=abc-123");
    // Regression: must NEVER route through /share/ on the main host, which
    // Lovable hosting serves as the generic SPA index.html.
    expect(url.startsWith(`${SITE_URL}/share/`)).toBe(false);
    expect(url).not.toBe(SITE_URL);
    expect(url).not.toBe(`${SITE_URL}/`);
  });

  it("shopCrawlerUrl uses UUID when supplied, else business name", () => {
    const uuid = "11111111-2222-3333-4444-555555555555";
    const withUuid = shopCrawlerUrl("Ferme Kokou", uuid);
    expect(withUuid).toContain(`id=${uuid}`);
    expect(withUuid).toContain("name=Ferme+Kokou");

    const withName = shopCrawlerUrl("Ferme Kokou");
    expect(withName).toContain("id=Ferme%20Kokou");
    expect(withName).not.toBe(SITE_URL);
    expect(withName).not.toBe(`${SITE_URL}/producteurs`);
  });

  it("canonical URLs stay on nukuconnect.com so refreshing lands on the app", () => {
    expect(productCanonicalUrl("42")).toBe(`${SITE_URL}/produit/42`);
    expect(shopCanonicalUrl("Ferme Kokou")).toBe(
      `${SITE_URL}/producteurs/Ferme%20Kokou`,
    );
    // Canonical must not point at the homepage for a valid id/name.
    expect(productCanonicalUrl("42")).not.toBe(SITE_URL);
    expect(shopCanonicalUrl("Ferme Kokou")).not.toBe(SITE_URL);
  });

  it("empty inputs safely fall back to the site root (no crash)", () => {
    expect(productCrawlerUrl("   ")).toBe(SITE_URL);
    expect(shopCrawlerUrl("   ")).toBe(SITE_URL);
  });
});

/**
 * Optional live check: only runs when SHARE_OG_LIVE=1 is set, e.g. on a
 * post-deploy CI job. Verifies that the deployed edge function returns real
 * OG HTML (not a redirect to the SPA shell) for a canonical product URL.
 */
const RUN_LIVE = typeof process !== "undefined" && process.env?.SHARE_OG_LIVE === "1";
const maybeIt = RUN_LIVE ? it : it.skip;

describe("Deployed share-og edge function (live)", () => {
  maybeIt("returns per-item OG HTML with meta-refresh to the canonical page", async () => {
    const url = productCrawlerUrl("smoke-test");
    const res = await fetch(url, {
      headers: {
        // Pretend to be Facebook's crawler so any UA gating serves OG HTML.
        "user-agent": "facebookexternalhit/1.1",
      },
      redirect: "manual",
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(400);
    const html = await res.text();
    // Must ship per-item OG tags AND redirect real users back to the app.
    expect(html).toMatch(/<meta\s+property=["']og:title["']/i);
    expect(html).toMatch(/<meta\s+property=["']og:url["']/i);
    expect(html).toMatch(/http-equiv=["']refresh["']/i);
    expect(html).toContain("nukuconnect.com");
    // Guard: response must NOT be the generic SPA index.html.
    expect(html).not.toMatch(/<div id=["']root["']><\/div>/);
  }, 15_000);
});
