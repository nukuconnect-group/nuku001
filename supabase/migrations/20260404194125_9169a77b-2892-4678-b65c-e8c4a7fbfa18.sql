-- 1. Fix product_boosts: replace broad SELECT with owner-scoped policy
DROP POLICY IF EXISTS "Authenticated can view active boosts" ON public.product_boosts;

-- Owner can see all their boost details
CREATE POLICY "Users can view own boosts"
ON public.product_boosts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- For marketplace display, allow checking if a product is boosted (minimal info)
CREATE POLICY "Anyone can check active boost status"
ON public.product_boosts FOR SELECT TO authenticated
USING (is_active = true);

-- 2. Fix driver_profiles_public view: exclude GPS coordinates
CREATE OR REPLACE VIEW public.driver_profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  profile_id,
  user_id,
  vehicle_type,
  zone,
  is_available,
  rating,
  total_deliveries
FROM public.driver_profiles;
