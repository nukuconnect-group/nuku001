import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/data/marketplace";
import defaultAvatar from "@/assets/default-producer-avatar.png";
import { cacheGet, cacheSet } from "@/lib/localCache";

export interface DbProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity_available: number;
  location: string | null;
  description: string | null;
  is_organic: boolean;
  images: string[] | null;
  created_at: string;
  producer_id: string;
  min_order: number | null;
  shipping_delay_days?: number | null;
  producer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    location: string | null;
    bio: string | null;
    phone?: string | null;
  };
}

interface PublicProducerProfile {
  id?: string;
  full_name?: string | null;
  business_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  location?: string | null;
  bio?: string | null;
}

// Image Unsplash spécifique par catégorie quand le produit n'a pas d'image valide
const categoryFallbackImages: Record<string, string> = {
  cereales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  céréales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  legumes: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&q=80",
  légumes: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&q=80",
  tubercules: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=600&q=80",
  elevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80",
  élevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80",
  aviculture: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80",
  volailles: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80",
  pisciculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&q=80",
  aquaculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&q=80",
  poisson: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&q=80",
  agriculture: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  agribusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
  agrobusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
  equipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
  équipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
  tomate: "https://images.unsplash.com/photo-1546470427-227df1b44d44?w=600&q=80",
  mais: "https://images.unsplash.com/photo-1601593768799-76d3ca2fbd58?w=600&q=80",
  maïs: "https://images.unsplash.com/photo-1601593768799-76d3ca2fbd58?w=600&q=80",
  riz: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  manioc: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80",
};

const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/");
};

const getProductImage = (images: string[] | null, category: string, name?: string): string => {
  if (images && images.length > 0 && isValidImageUrl(images[0])) return images[0]!;
  const haystack = `${(name || "").toLowerCase()} ${category.toLowerCase()}`.trim();
  for (const [k, v] of Object.entries(categoryFallbackImages)) {
    if (haystack.includes(k)) return v;
  }
  return "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&q=80";
};

const mapDbToProduct = (p: DbProduct, publicProducer?: PublicProducerProfile | null): Product => {
  // Affiche EN PRIORITÉ le nom d'entreprise (style Alibaba)
  const displayName =
    publicProducer?.business_name?.trim() ||
    publicProducer?.full_name?.trim() ||
    p.producer?.full_name?.trim() ||
    "Fournisseur";
  return {
    id: p.id,
    slug: (p as any).slug || undefined,
    name: p.name,
    category: p.category,
    price: p.price,
    unit: p.unit,
    quantity: p.quantity_available,
    location: p.location || "Togo",
    description: p.description || "",
    isOrganic: p.is_organic,
    image: getProductImage(p.images, p.category, p.name),
    images: p.images || [],
    createdAt: p.created_at,
    shippingDelayDays: (p as any).shipping_delay_days ?? 1,
    producer: {
      id: p.producer_id,
      name: displayName,
      avatar: publicProducer?.avatar_url || p.producer?.avatar_url || defaultAvatar,
      rating: 4.5,
      // Priority to public RPC (always returns latest) then producer join
      verified: Boolean(publicProducer?.is_verified ?? p.producer?.is_verified ?? false),
      bio: publicProducer?.bio || p.producer?.bio || "",
      phone: "",
    },
  };
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchPublicProducerProfiles(rows: DbProduct[]) {
  const producerIds = Array.from(new Set(rows.map((row) => row.producer?.id || row.producer_id).filter(Boolean)));

  const entries = await Promise.all(
    producerIds.map(async (profileId) => {
      try {
        const { data, error } = await supabase.rpc("get_public_profile_data", { p_profile_id: profileId });
        if (error || !data || typeof data !== "object") {
          return [profileId, null] as const;
        }
        return [profileId, data as PublicProducerProfile] as const;
      } catch {
        return [profileId, null] as const;
      }
    }),
  );

  return new Map(entries);
}

async function enrichProductsWithPublicProfiles(rows: DbProduct[]): Promise<Product[]> {
  const publicProfiles = await fetchPublicProducerProfiles(rows);
  return rows.map((row) => mapDbToProduct(row, publicProfiles.get(row.producer?.id || row.producer_id) || null));
}

async function fetchProductsDirect(): Promise<Product[]> {
  const url = `${SUPABASE_URL}/rest/v1/products?select=*,producer:profiles!products_producer_id_fkey(id,full_name,avatar_url,is_verified,location,bio)&moderation_status=eq.approved&order=created_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
  const data = await res.json();
  return enrichProductsWithPublicProfiles((data || []) as DbProduct[]);
}

// Detect formation/training-related products to exclude from marketplace
const isFormationProduct = (p: { name?: string; category?: string; description?: string | null }) => {
  const haystack = `${p.name || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase();
  return /\b(formation|formations|cours|tutoriel|tutoriels|module pédagogique|e-learning|elearning|training|learning)\b/.test(haystack);
};

const filterOutFormations = (products: Product[]) =>
  products.filter((p) => !isFormationProduct({ name: p.name, category: p.category, description: p.description }));

const PRODUCTS_LIST_KEY = "products-list";
const PRODUCT_BY_ID_KEY = (id: string) => `product-id:${id}`;

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            producer:profiles!products_producer_id_fkey(
              id, full_name, avatar_url, is_verified, location, bio
            )
          `)
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false });

        if (error) throw error;
        const allProducts = await enrichProductsWithPublicProfiles((data || []) as DbProduct[]);
        const products = filterOutFormations(allProducts);
        cacheSet(PRODUCTS_LIST_KEY, products, 1000 * 60 * 60 * 6); // 6h
        return products;
      } catch (e) {
        console.warn("Supabase client failed, trying direct fetch:", e);
        try {
          const allProducts = await fetchProductsDirect();
          const products = filterOutFormations(allProducts);
          cacheSet(PRODUCTS_LIST_KEY, products, 1000 * 60 * 60 * 6);
          return products;
        } catch (fetchErr) {
          // Offline / network failure → ressers le cache local
          const cached = cacheGet<Product[]>(PRODUCTS_LIST_KEY);
          if (cached) {
            console.info("[cache] Returning cached products list");
            return cached.data;
          }
          throw fetchErr;
        }
      }
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 5000),
    placeholderData: () => {
      const cached = cacheGet<Product[]>(PRODUCTS_LIST_KEY);
      return cached?.data;
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            producer:profiles!products_producer_id_fkey(
              id, full_name, avatar_url, is_verified, location, bio
            )
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Product not found");
        const [product] = await enrichProductsWithPublicProfiles([data as DbProduct]);
        cacheSet(PRODUCT_BY_ID_KEY(id), product, 1000 * 60 * 60 * 6);
        return product;
      } catch (e) {
        console.warn("Supabase client failed for product, using direct fetch:", e);
        try {
          const url = `${SUPABASE_URL}/rest/v1/products?select=*,producer:profiles!products_producer_id_fkey(id,full_name,avatar_url,is_verified,location,bio)&id=eq.${id}`;
          const res = await fetch(url, {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          });
          if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`);
          const data = await res.json();
          if (!data?.[0]) throw new Error("Product not found");
          const [product] = await enrichProductsWithPublicProfiles([data[0] as DbProduct]);
          cacheSet(PRODUCT_BY_ID_KEY(id), product, 1000 * 60 * 60 * 6);
          return product;
        } catch (err) {
          const cached = cacheGet<Product>(PRODUCT_BY_ID_KEY(id));
          if (cached) {
            console.info("[cache] Returning cached product", id);
            return cached.data;
          }
          throw err;
        }
      }
    },
    enabled: !!id,
    placeholderData: () => {
      const cached = cacheGet<Product>(PRODUCT_BY_ID_KEY(id));
      return cached?.data;
    },
  });
};

export const useProductBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["product-slug", slug],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            producer:profiles!products_producer_id_fkey(
              id, full_name, avatar_url, is_verified, location, bio
            )
          `)
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Product not found");
        const [product] = await enrichProductsWithPublicProfiles([data as DbProduct]);
        cacheSet(`product-slug:${slug}`, product, 1000 * 60 * 60 * 6);
        return product;
      } catch (err) {
        const cached = cacheGet<Product>(`product-slug:${slug}`);
        if (cached) {
          console.info("[cache] Returning cached product by slug", slug);
          return cached.data;
        }
        throw err;
      }
    },
    enabled: !!slug,
    placeholderData: () => {
      const cached = cacheGet<Product>(`product-slug:${slug}`);
      return cached?.data;
    },
  });
};
