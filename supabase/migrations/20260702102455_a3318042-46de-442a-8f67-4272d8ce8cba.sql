CREATE OR REPLACE FUNCTION public.get_network_profiles_optimized(_limit integer DEFAULT 120)
 RETURNS TABLE(id uuid, user_id uuid, full_name text, business_name text, bio text, avatar_url text, cover_url text, location text, cover_images text[], is_verified boolean, created_at timestamp with time zone, user_type text, products_count bigint, followers_count bigint, sales_count bigint)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH selected_profiles AS (
    SELECT p.id, p.user_id, p.full_name, p.business_name, p.bio, p.avatar_url, p.cover_url,
           p.location, p.cover_images, p.is_verified, p.created_at, p.user_type
    FROM public.profiles p
    WHERE p.user_type IN ('producer', 'supplier', 'producteur', 'fournisseur')
    ORDER BY p.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 120), 1), 200)
  ), product_counts AS (
    SELECT producer_id, count(*)::bigint AS count
    FROM public.products
    WHERE producer_id IN (SELECT selected_profiles.id FROM selected_profiles)
    GROUP BY producer_id
  ), follower_counts AS (
    SELECT following_id, count(*)::bigint AS count
    FROM public.follows
    WHERE following_id IN (SELECT selected_profiles.id FROM selected_profiles)
    GROUP BY following_id
  ), sales_counts AS (
    SELECT seller_id, count(*)::bigint AS count
    FROM public.orders
    WHERE seller_id IN (SELECT selected_profiles.id FROM selected_profiles)
    GROUP BY seller_id
  )
  SELECT sp.id, sp.user_id, sp.full_name, sp.business_name, sp.bio, sp.avatar_url, sp.cover_url,
         sp.location, sp.cover_images, sp.is_verified, sp.created_at, sp.user_type,
         COALESCE(pc.count, 0), COALESCE(fc.count, 0), COALESCE(sc.count, 0)
  FROM selected_profiles sp
  LEFT JOIN product_counts pc ON pc.producer_id = sp.id
  LEFT JOIN follower_counts fc ON fc.following_id = sp.id
  LEFT JOIN sales_counts sc ON sc.seller_id = sp.id
  ORDER BY sp.created_at DESC
$function$;

GRANT EXECUTE ON FUNCTION public.get_network_profiles_optimized(integer) TO anon, authenticated;