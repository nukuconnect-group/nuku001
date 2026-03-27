DROP POLICY IF EXISTS "Anyone can view active boosts" ON public.product_boosts;

CREATE POLICY "Authenticated can view active boosts"
ON public.product_boosts
FOR SELECT
TO authenticated
USING (is_active = true);