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

const mapDbToProduct = (p: DbProduct): Product => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.price,
  unit: p.unit,
  quantity: p.quantity_available,
  location: p.location || "Togo",
  description: p.description || "",
  isOrganic: p.is_organic,
  image: p.images?.[0] || "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400",
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
              id, full_name, avatar_url, is_verified, location, bio, phone
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data || []).map((p: any) => mapDbToProduct(p));
      } catch (e) {
        console.warn("Supabase client failed, using direct fetch:", e);
        return fetchProductsDirect();
      }
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: 3,
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
              id, full_name, avatar_url, is_verified, location, bio, phone
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        return mapDbToProduct(data as any);
      } catch (e) {
        console.warn("Supabase client failed for product, using direct fetch:", e);
        const url = `${SUPABASE_URL}/rest/v1/products?select=*,producer:profiles!products_producer_id_fkey(id,full_name,avatar_url,is_verified,location,bio,phone)&id=eq.${id}`;
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
