import { DEFAULT_SOCIAL_IMAGE } from "@/lib/shareOg";

const firstRealImage = (images?: Array<string | null | undefined> | null) =>
  images?.find((img) => typeof img === "string" && img.trim().length > 0)?.trim() || null;

export interface ProductSeoInput {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  price?: number | null;
  unit?: string | null;
  location?: string | null;
  quantity?: number | null;
  images?: Array<string | null | undefined> | null;
  producerName?: string | null;
}

export const buildProductSeoMeta = (product: ProductSeoInput) => {
  const path = `/produit/${encodeURIComponent(product.slug || product.id)}`;
  const image = firstRealImage(product.images) || DEFAULT_SOCIAL_IMAGE;
  const price = product.price != null ? Number(product.price) : undefined;
  const description =
    product.description?.trim() ||
    `${product.name}${price != null ? ` - ${price.toLocaleString("fr-FR")} FCFA/${product.unit || "unité"}` : ""}${product.location ? ` disponible à ${product.location}` : " disponible sur NukuConnect"}.`;

  return {
    path,
    title: product.name,
    description,
    image,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description,
      image,
      offers: {
        "@type": "Offer",
        price: price ?? 0,
        priceCurrency: "XOF",
        availability: (product.quantity ?? 1) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: product.producerName || "NUKUCONNECT",
        },
      },
    },
  };
};

export interface ShopSeoInput {
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  location?: string | null;
}

export const buildShopSeoMeta = (shop: ShopSeoInput) => {
  const title = shop.name.trim() || "Boutique NukuConnect";
  const path = `/producteurs/${encodeURIComponent(title)}`;
  const image = firstRealImage([shop.coverUrl, shop.avatarUrl]) || DEFAULT_SOCIAL_IMAGE;
  const description = shop.bio?.trim() || `Découvrez la boutique ${title}${shop.location ? ` (${shop.location})` : ""} sur NukuConnect.`;

  return {
    path,
    title,
    description,
    image,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: title,
      url: path,
      logo: shop.avatarUrl || image,
      image,
      description,
    },
  };
};