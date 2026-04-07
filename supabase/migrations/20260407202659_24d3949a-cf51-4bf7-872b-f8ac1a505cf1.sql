-- 1. Fix demands INSERT: validate profile_id belongs to auth.uid()
DROP POLICY IF EXISTS "Users can create demands" ON public.demands;
CREATE POLICY "Users can create demands"
ON public.demands
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = demands.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- 2. Fix product_boosts INSERT: validate product_id belongs to auth.uid()
DROP POLICY IF EXISTS "Users can create their own boosts" ON public.product_boosts;
CREATE POLICY "Users can create their own boosts"
ON public.product_boosts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.profiles pr ON pr.id = p.producer_id
    WHERE p.id = product_boosts.product_id
    AND pr.user_id = auth.uid()
  )
);