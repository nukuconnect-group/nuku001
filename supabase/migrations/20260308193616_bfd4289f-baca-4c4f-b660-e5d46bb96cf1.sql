
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow authenticated users to insert categories (for sellers creating custom ones)
CREATE POLICY "Authenticated users can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (true);
