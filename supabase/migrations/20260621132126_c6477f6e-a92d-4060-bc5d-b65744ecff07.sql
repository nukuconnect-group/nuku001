
-- 1. blog_comment_likes: own-only SELECT
DROP POLICY IF EXISTS "Authenticated users can view comment likes" ON public.blog_comment_likes;
CREATE POLICY "Users view own comment likes" ON public.blog_comment_likes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2. blog_comments: own-only SELECT + RPC for public listing
DROP POLICY IF EXISTS "Authenticated users can view blog comments" ON public.blog_comments;
CREATE POLICY "Authors view own blog comments" ON public.blog_comments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_blog_comments(_slug text)
RETURNS TABLE(
  id uuid, content text, likes_count integer, created_at timestamptz,
  author_name text, author_avatar_url text, is_mine boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bc.id, bc.content, bc.likes_count, bc.created_at,
         p.full_name, p.avatar_url,
         (bc.user_id = auth.uid()) AS is_mine
  FROM public.blog_comments bc
  LEFT JOIN public.profiles p ON p.user_id = bc.user_id
  WHERE bc.slug = _slug
  ORDER BY bc.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_blog_comments(text) TO anon, authenticated;

-- 3. follows: participant-only SELECT + RPC for public counts
DROP POLICY IF EXISTS "Anyone authenticated can view follows" ON public.follows;
CREATE POLICY "Participants view follows" ON public.follows
  FOR SELECT TO authenticated USING (
    follower_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR following_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.get_follower_counts(_profile_ids uuid[])
RETURNS TABLE(profile_id uuid, follower_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT following_id, count(*)::bigint
  FROM public.follows
  WHERE following_id = ANY(_profile_ids)
  GROUP BY following_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_follower_counts(uuid[]) TO anon, authenticated;

-- 4. reviews: own-only SELECT + RPC for public listing & averages
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.reviews;
CREATE POLICY "Authors view own reviews" ON public.reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_product_reviews(_product_id uuid)
RETURNS TABLE(
  id uuid, product_id uuid, rating integer, comment text, created_at timestamptz,
  author_name text, author_avatar_url text, is_mine boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.product_id, r.rating, r.comment, r.created_at,
         p.full_name, p.avatar_url,
         (r.user_id = auth.uid()) AS is_mine
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.product_id = _product_id
  ORDER BY r.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_product_avg_rating(_product_ids uuid[])
RETURNS TABLE(product_id uuid, avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT product_id, avg(rating)::numeric, count(*)::bigint
  FROM public.reviews
  WHERE product_id = ANY(_product_ids)
  GROUP BY product_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_product_avg_rating(uuid[]) TO anon, authenticated;

-- 5. driver_ratings: participant-only SELECT + RPC for public listing
DROP POLICY IF EXISTS "Authenticated can view all driver ratings" ON public.driver_ratings;
CREATE POLICY "Driver or author views ratings" ON public.driver_ratings
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR driver_id IN (SELECT id FROM public.driver_profiles WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.get_driver_ratings(_driver_id uuid)
RETURNS TABLE(
  id uuid, rating integer, comment text, created_at timestamptz,
  author_name text, author_avatar_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT dr.id, dr.rating, dr.comment, dr.created_at,
         p.full_name, p.avatar_url
  FROM public.driver_ratings dr
  LEFT JOIN public.profiles p ON p.user_id = dr.user_id
  WHERE dr.driver_id = _driver_id
  ORDER BY dr.created_at DESC
  LIMIT 100;
$$;
GRANT EXECUTE ON FUNCTION public.get_driver_ratings(uuid) TO anon, authenticated;
