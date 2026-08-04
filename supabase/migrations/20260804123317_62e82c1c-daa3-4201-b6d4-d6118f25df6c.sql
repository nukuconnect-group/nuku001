DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.categories;

CREATE POLICY "Users can propose inactive categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND is_active = false
);

CREATE POLICY "Users can view their proposed categories"
ON public.categories
FOR SELECT
TO authenticated
USING (created_by = auth.uid());