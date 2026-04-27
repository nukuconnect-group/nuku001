ALTER TABLE public.formations
ADD COLUMN IF NOT EXISTS author_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_formations_author_user_id
ON public.formations(author_user_id);

DROP POLICY IF EXISTS "Authenticated users can create own formations" ON public.formations;
CREATE POLICY "Authenticated users can create own formations"
ON public.formations
FOR INSERT
TO authenticated
WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update own formations" ON public.formations;
CREATE POLICY "Authors can update own formations"
ON public.formations
FOR UPDATE
TO authenticated
USING (author_user_id = auth.uid())
WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can view own formations" ON public.formations;
CREATE POLICY "Authors can view own formations"
ON public.formations
FOR SELECT
TO authenticated
USING (author_user_id = auth.uid());