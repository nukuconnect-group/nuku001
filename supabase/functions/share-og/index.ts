// Edge function that serves crawler-friendly OG/Twitter HTML for product and
// shop share links. Social crawlers (WhatsApp, Facebook, LinkedIn, Telegram,
// X) don't execute JS, so they never see the <Helmet> meta on our SPA pages.
// This function:
//  - looks up the product / supplier from the DB
//  - returns a tiny HTML page with the right <meta property="og:*"> values
//  - offers a delayed browser refresh to the canonical SPA URL after crawlers read the tags
//
// Usage:
//   /functions/v1/share-og?type=product&id=<id-or-slug>
//   /functions/v1/share-og?type=shop&name=<business-name>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SITE = "https://nukuconnect.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

interface OgPayload {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "product" | "profile" | "website";
  price?: number;
  jsonLd?: Record<string, unknown>;
}

const renderHtml = (p: OgPayload) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}" />
<link rel="canonical" href="${esc(p.url)}" />
<meta property="og:type" content="${esc(p.type)}" />
<meta property="og:site_name" content="NUKUCONNECT" />
<meta property="og:title" content="${esc(p.title)}" />
<meta property="og:description" content="${esc(p.description)}" />
<meta property="og:image" content="${esc(p.image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(p.url)}" />
<meta property="og:locale" content="fr_FR" />
${p.price != null ? `<meta property="product:price:amount" content="${p.price}" /><meta property="product:price:currency" content="XOF" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)}" />
<meta name="twitter:description" content="${esc(p.description)}" />
<meta name="twitter:image" content="${esc(p.image)}" />
${p.jsonLd ? `<script type="application/ld+json">${JSON.stringify(p.jsonLd).replace(/</g, "\\u003c")}</script>` : ""}
<meta http-equiv="refresh" content="3; url=${esc(p.url)}" />
</head>
<body>
<p>Redirection vers <a href="${esc(p.url)}">${esc(p.title)}</a>…</p>
</body>
</html>`;

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function buildProduct(admin: any, id: string): Promise<OgPayload | null> {
  const col = isUUID(id) ? "id" : "slug";
  const { data: product } = await admin
    .from("products")
    .select("id, slug, name, description, price, unit, images, location")
    .eq(col, id)
    .maybeSingle();
  if (!product) return null;
  const img =
    (Array.isArray(product.images) && product.images.find((value: unknown) => typeof value === "string" && value.trim())) ||
    DEFAULT_IMAGE;
  const slug = product.slug || product.id;
  const url = `${SITE}/produit/${encodeURIComponent(slug)}`;
  const priceStr = product.price
    ? ` — ${Number(product.price).toLocaleString("fr-FR")} FCFA/${product.unit || "unité"}`
    : "";
  return {
    title: `${product.name}${priceStr}`,
    description:
      product.description ||
      `${product.name} disponible sur NukuConnect${product.location ? ` à ${product.location}` : ""}.`,
    image: img,
    url,
    type: "product",
    price: product.price ? Number(product.price) : undefined,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description || product.name,
      image: img,
      offers: {
        "@type": "Offer",
        price: product.price || 0,
        priceCurrency: "XOF",
        url,
      },
    },
  };
}

async function buildShop(admin: any, name: string): Promise<OgPayload | null> {
  const clean = decodeURIComponent(name).trim();
  // Try exact business_name first, then full_name fallback
  let { data: profile } = await admin
    .from("profiles")
    .select("user_id, full_name, business_name, bio, avatar_url, cover_url, location")
    .ilike("business_name", clean)
    .maybeSingle();
  if (!profile) {
    const { data: byFull } = await admin
      .from("profiles")
      .select("user_id, full_name, business_name, bio, avatar_url, cover_url, location")
      .ilike("full_name", clean)
      .maybeSingle();
    profile = byFull;
  }
  if (!profile) return null;
  const title = profile.business_name || profile.full_name || "Boutique";
  const image = profile.cover_url || profile.avatar_url || DEFAULT_IMAGE;
  const url = `${SITE}/producteurs/${encodeURIComponent(title)}`;
  return {
    title,
    description:
      profile.bio ||
      `Découvrez la boutique ${title}${profile.location ? ` (${profile.location})` : ""} sur NukuConnect.`,
    image,
    url,
    type: "profile",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: title,
      url,
      logo: profile.avatar_url || image,
      image,
    },
  };
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let payload: OgPayload | null = null;

    if (type === "product") {
      const id = url.searchParams.get("id") || url.searchParams.get("slug") || "";
      if (id) payload = await buildProduct(admin, id);
    } else if (type === "shop" || type === "profile" || type === "producer") {
      const name = url.searchParams.get("name") || url.searchParams.get("id") || "";
      if (name) payload = await buildShop(admin, name);
    }

    if (!payload) {
      payload = {
        title: "NUKUCONNECT — Marketplace Agricole Intelligent d'Afrique",
        description:
          "La marketplace agricole intelligente d'Afrique. Producteurs vérifiés, livraison rapide.",
        image: DEFAULT_IMAGE,
        url: SITE,
        type: "website",
      };
    }

    return new Response(renderHtml(payload), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (e) {
    return new Response(`Erreur: ${(e as Error).message}`, { status: 500 });
  }
});
