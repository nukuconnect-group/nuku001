import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/data/marketplace";

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
  producer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    location: string | null;
    bio: string | null;
    phone: string | null;
  };
}

const categoryFallbackImages: Record<string, string> = {
  céréales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400",
  légumes: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400",
  tubercules: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400",
  élevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400",
  aviculture: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400",
  pisciculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=400",
  aquaculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=400",
  agrobusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400",
  équipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400",
};

const getProductImage = (images: string[] | null, category: string): string => {
  if (images?.[0]) return images[0];
  const key = category.toLowerCase().trim();
  for (const [k, v] of Object.entries(categoryFallbackImages)) {
    if (key.includes(k)) return v;
  }
  return "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400";
};

const mapDbToProduct = (p: DbProduct): Product => ({
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
  image: getProductImage(p.images, p.category),
  images: p.images || [],
  createdAt: p.created_at,
  producer: {
    id: p.producer_id,
    name: p.producer?.full_name || "Producteur",
    avatar: p.producer?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    rating: 4.5,
    verified: p.producer?.is_verified || false,
    bio: p.producer?.bio || "",
    phone: "",
  },
});

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchProductsDirect(): Promise<Product[]> {
  const url = `${SUPABASE_URL}/rest/v1/products?select=*,producer:profiles!products_producer_id_fkey(id,full_name,avatar_url,is_verified,location,bio)&order=created_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
  const data = await res.json();
  return (data || []).map((p: any) => mapDbToProduct(p));
}

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
          .order("created_at", { ascending: false });

        if (error) throw error;
        const products = (data || []).map((p: any) => mapDbToProduct(p));
        // Cache for offline use
        try { localStorage.setItem("nuku_products_cache", JSON.stringify(products)); } catch {}
        return products;
      } catch (e) {
        console.warn("Supabase client failed, trying direct fetch:", e);
        try {
          const products = await fetchProductsDirect();
          try { localStorage.setItem("nuku_products_cache", JSON.stringify(products)); } catch {}
          return products;
        } catch (fetchErr) {
          // Offline fallback
          console.warn("Network unavailable, using cached products");
          const cached = localStorage.getItem("nuku_products_cache");
          if (cached) return JSON.parse(cached) as Product[];
          return [];
        }
      }
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 5000),
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
        return mapDbToProduct(data as any);
      } catch (e) {
        console.warn("Supabase client failed for product, using direct fetch:", e);
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
        return mapDbToProduct(data[0]);
      }
    },
    enabled: !!id,
  });
};

export const useProductBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["product-slug", slug],
    queryFn: async () => {
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
      return mapDbToProduct(data as any);
    },
    enabled: !!slug,
  });
};
