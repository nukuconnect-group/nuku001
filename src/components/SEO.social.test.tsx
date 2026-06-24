import { cleanup, render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SEO from "./SEO";
import { buildProductSeoMeta, buildShopSeoMeta } from "@/lib/socialMeta";
import { DEFAULT_SOCIAL_IMAGE, productCanonicalUrl, productCrawlerUrl, productShareUrl, shopCanonicalUrl, shopCrawlerUrl, shopShareUrl } from "@/lib/shareOg";

vi.mock("@/hooks/useSeoSettings", () => ({
  useSeoSettings: () => null,
}));

const getMeta = (selector: string) => document.head.querySelector<HTMLMetaElement>(selector)?.content;
const getJsonLd = () => JSON.parse(document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')?.textContent || "{}");

const renderSeo = (node: ReactNode, route = "/") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>
    </HelmetProvider>,
  );

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
});

describe("social SEO rendering", () => {
  it("renders product OG, Twitter and JSON-LD with canonical product URL, main image and price", async () => {
    const meta = buildProductSeoMeta({
      id: "product-id-1",
      slug: "mais-jaune-premium",
      name: "Maïs Jaune Premium",
      description: "Maïs jaune de qualité supérieure prêt pour la transformation.",
      price: 135000,
      unit: "tonne",
      quantity: 50,
      images: ["https://cdn.nukuconnect.com/products/mais.jpg"],
      producerName: "Ferme Kofi",
    });

    renderSeo(<SEO url={meta.path} title={meta.title} description={meta.description} image={meta.image} type="product" jsonLd={meta.jsonLd} />, meta.path);

    await waitFor(() => expect(document.title).toContain("Maïs Jaune Premium"));
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe("https://nukuconnect.com/produit/mais-jaune-premium");
    expect(getMeta('meta[property="og:type"]')).toBe("product");
    expect(getMeta('meta[property="og:title"]')).toContain("Maïs Jaune Premium");
    expect(getMeta('meta[property="og:description"]')).toBe(meta.description);
    expect(getMeta('meta[property="og:image"]')).toBe("https://cdn.nukuconnect.com/products/mais.jpg");
    expect(getMeta('meta[property="og:url"]')).toBe(productCanonicalUrl("mais-jaune-premium"));
    expect(getMeta('meta[name="twitter:title"]')).toContain("Maïs Jaune Premium");
    expect(getMeta('meta[name="twitter:image"]')).toBe("https://cdn.nukuconnect.com/products/mais.jpg");
    expect(getJsonLd()).toMatchObject({
      "@type": "Product",
      name: "Maïs Jaune Premium",
      image: "https://cdn.nukuconnect.com/products/mais.jpg",
      offers: { price: 135000, priceCurrency: "XOF" },
    });
  });

  it("renders shop OG, Twitter and JSON-LD with canonical shop URL and default image fallback", async () => {
    const meta = buildShopSeoMeta({
      name: "Jeunagriculteur",
      bio: "Boutique agricole spécialisée en intrants et produits frais.",
      avatarUrl: null,
      coverUrl: null,
      location: "Lomé",
    });

    renderSeo(<SEO url={meta.path} title={meta.title} description={meta.description} image={meta.image} type="profile" jsonLd={meta.jsonLd} />, meta.path);

    await waitFor(() => expect(document.title).toContain("Jeunagriculteur"));
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe("https://nukuconnect.com/producteurs/Jeunagriculteur");
    expect(getMeta('meta[property="og:type"]')).toBe("profile");
    expect(getMeta('meta[property="og:title"]')).toContain("Jeunagriculteur");
    expect(getMeta('meta[property="og:description"]')).toBe(meta.description);
    expect(getMeta('meta[property="og:image"]')).toBe(DEFAULT_SOCIAL_IMAGE);
    expect(getMeta('meta[property="og:url"]')).toBe(shopCanonicalUrl("Jeunagriculteur"));
    expect(getMeta('meta[name="twitter:image"]')).toBe(DEFAULT_SOCIAL_IMAGE);
    expect(getJsonLd()).toMatchObject({
      "@type": "Organization",
      name: "Jeunagriculteur",
      image: DEFAULT_SOCIAL_IMAGE,
    });
  });

  it("builds public NukuConnect share links instead of exposing backend function URLs", () => {
    expect(productShareUrl("incubateur-moderne-clarias-togo")).toBe("https://nukuconnect.com/produit/incubateur-moderne-clarias-togo");
    expect(shopShareUrl("Roger Assiontemba", "3fa9c88d-4000-424c-85b7-a40f11f647f3")).toBe("https://nukuconnect.com/producteurs/Roger%20Assiontemba");
    expect(productCrawlerUrl("incubateur-moderne-clarias-togo")).toContain("https://nukuconnect.com/share/product/incubateur-moderne-clarias-togo?");
    expect(productCrawlerUrl("incubateur-moderne-clarias-togo")).not.toContain("supabase.co");
    expect(shopCrawlerUrl("Roger Assiontemba", "3fa9c88d-4000-424c-85b7-a40f11f647f3")).toContain("https://nukuconnect.com/share/shop/roger-assiontemba?");
    expect(shopCrawlerUrl("Roger Assiontemba", "3fa9c88d-4000-424c-85b7-a40f11f647f3")).not.toContain("supabase.co");
  });
});