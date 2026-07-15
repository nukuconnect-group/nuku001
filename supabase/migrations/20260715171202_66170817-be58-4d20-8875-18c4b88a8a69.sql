
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow any authenticated user to insert a new category (auto-active).
CREATE POLICY "Authenticated users can create categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by IS NULL OR created_by = auth.uid())
    AND is_active = true
  );
