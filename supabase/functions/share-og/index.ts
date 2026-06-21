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
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeText = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");

const firstRealImage = (...values: unknown[]) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const found = value.find((item) => typeof item === "string" && item.trim().length > 0);
      if (found) return String(found).trim();
    }
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return DEFAULT_IMAGE;
};

interface OgPayload {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "product" | "profile" | "website";
  price?: number;
  jsonLd?: Record<string, unknown>;
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

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
<script>setTimeout(function(){window.location.replace(${JSON.stringify(p.url)});},800);</script>
</head>
<body>
<p>Redirection vers <a href="${esc(p.url)}">${esc(p.title)}</a>…</p>
</body>
</html>`;

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function buildProduct(admin: any, id: string): Promise<OgPayload | null> {
  const clean = decodeURIComponent(id).trim();
  const col = isUUID(clean) ? "id" : "slug";
  let { data: product } = await admin
    .from("products")
    .select("id, slug, name, description, price, unit, images, location")
    .eq(col, clean)
    .maybeSingle();
  if (!product && !isUUID(clean)) {
    const { data: byName } = await admin
      .from("products")
      .select("id, slug, name, description, price, unit, images, location")
      .ilike("name", clean)
      .maybeSingle();
    product = byName;
  }
  if (!product) return null;
  const img = firstRealImage(product.images);
  const slug = product.slug || product.id;
  const url = `${SITE}/produit/${encodeURIComponent(slug)}`;
  const priceStr = product.price
    ? ` — ${Number(product.price).toLocaleString("fr-FR")} FCFA/${product.unit || "unité"}`
    : "";
  const productName = normalizeText(product.name || "Produit NukuConnect");
  const description = normalizeText(product.description) || `${productName} disponible sur NukuConnect${product.location ? ` à ${normalizeText(product.location)}` : ""}.`;
  return {
    title: `${productName}${priceStr}`,
    description,
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
  const isProfileId = isUUID(clean);
  let profile: any = null;
  if (isProfileId) {
    const { data: byId } = await admin
      .from("profiles")
      .select("id, user_id, full_name, business_name, bio, avatar_url, cover_url, location, cover_images")
      .eq("id", clean)
      .maybeSingle();
    profile = byId;
  }
  if (!profile) {
    const { data: byBusiness } = await admin
      .from("profiles")
      .select("id, user_id, full_name, business_name, bio, avatar_url, cover_url, location, cover_images")
      .ilike("business_name", clean)
      .maybeSingle();
    profile = byBusiness;
  }
  if (!profile) {
    const { data: byFull } = await admin
      .from("profiles")
      .select("id, user_id, full_name, business_name, bio, avatar_url, cover_url, location, cover_images")
      .ilike("full_name", clean)
      .maybeSingle();
    profile = byFull;
  }
  if (!profile && clean) {
    const pattern = `%${clean.replace(/[%_]/g, "")}%`;
    const { data: fuzzy } = await admin
    .from("profiles")
      .select("id, user_id, full_name, business_name, bio, avatar_url, cover_url, location, cover_images")
      .or(`business_name.ilike.${pattern},full_name.ilike.${pattern}`)
      .limit(1)
      .maybeSingle();
    profile = fuzzy;
  }
  if (!profile) return null;
  const title = normalizeText(profile.business_name || profile.full_name || "Boutique NukuConnect");
  const image = firstRealImage(profile.cover_url, profile.cover_images, profile.avatar_url);
  const url = `${SITE}/producteurs/${encodeURIComponent(title)}`;
  const description = normalizeText(profile.bio) || `Voici la boutique ${title}${profile.location ? ` (${normalizeText(profile.location)})` : ""} sur NukuConnect.`;
  return {
    title,
    description,
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

async function alertAdmins(admin: any, title: string, description: string, details: Record<string, unknown>) {
  try {
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await admin.from("notifications").insert(admins.map((a: any) => ({
        user_id: a.user_id,
        type: "seo",
        title,
        description,
      })));
    }
    console.warn("[share-og:alert]", JSON.stringify({ title, description, details }));
  } catch (error) {
    console.error("[share-og:alert-failed]", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const format = url.searchParams.get("format") || "html";
    const cacheBust = url.searchParams.get("v") || "";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let payload: OgPayload | null = null;
    let resolved = false;

    if (type === "product") {
      const id = url.searchParams.get("id") || url.searchParams.get("slug") || "";
      if (id) payload = await buildProduct(admin, id);
      resolved = Boolean(payload);
    } else if (type === "shop" || type === "profile" || type === "producer") {
      const name = url.searchParams.get("id") || url.searchParams.get("name") || "";
      if (name) payload = await buildShop(admin, name);
      resolved = Boolean(payload);
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

    const diagnostics = {
      ok: resolved,
      resolved,
      type: payload.type,
      requestedType: type,
      cacheBust,
      durationMs: Date.now() - startedAt,
      meta: {
        title: payload.title,
        description: payload.description,
        image: payload.image,
        url: payload.url,
        hasTitle: Boolean(payload.title),
        hasDescription: Boolean(payload.description),
        hasImage: Boolean(payload.image && payload.image !== DEFAULT_IMAGE),
        hasCanonicalUrl: Boolean(payload.url && payload.url !== SITE),
      },
      twitter: {
        card: "summary_large_image",
        title: payload.title,
        description: payload.description,
        image: payload.image,
      },
      jsonLd: payload.jsonLd || null,
    };

    console.log("[share-og]", JSON.stringify({ ...diagnostics, userAgent: req.headers.get("user-agent") || "" }));
    if (!resolved || !diagnostics.meta.hasTitle || !diagnostics.meta.hasDescription || !payload.image) {
      await alertAdmins(
        admin,
        "⚠️ Aperçu partage incomplet",
        `share-og n'a pas résolu les métadonnées ${type || "inconnues"}.`,
        { requestedType: type, search: url.search, diagnostics },
      );
    }

    if (format === "json" || url.searchParams.get("diagnostic") === "1") return json(diagnostics);

    return new Response(renderHtml(payload), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": cacheBust ? "no-store" : "public, max-age=300, s-maxage=600",
      },
    });
  } catch (e) {
    console.error("[share-og:error]", e);
    return json({ ok: false, error: (e as Error).message, durationMs: Date.now() - startedAt }, 500);
  }
});
