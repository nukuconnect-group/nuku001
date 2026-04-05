-- Fix categories policy to only expose active categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;

CREATE POLICY "Anyone can view active categories"
ON public.categories FOR SELECT TO public
USING (is_active = true);