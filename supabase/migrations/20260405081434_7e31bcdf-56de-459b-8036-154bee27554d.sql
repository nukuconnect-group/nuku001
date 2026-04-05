-- 1. Drop existing INSERT policy on formation_progress
DROP POLICY IF EXISTS "Users can insert own progress" ON public.formation_progress;

-- 2. Create restricted INSERT policy: users can only self-enroll in FREE formations
CREATE POLICY "Users can enroll in free formations"
ON public.formation_progress FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.formations f
    WHERE f.id = formation_progress.formation_id
    AND (f.is_paid = false OR f.is_paid IS NULL)
  )
);

-- 3. Admins can insert enrollment for any formation (after payment verification)
CREATE POLICY "Admins can manage enrollment"
ON public.formation_progress FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- 4. Create a SECURITY DEFINER function for server-side paid enrollment
CREATE OR REPLACE FUNCTION public.enroll_paid_formation(p_user_id uuid, p_formation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_formation RECORD;
  v_progress_id uuid;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: only admins can enroll users in paid formations';
  END IF;

  -- Verify formation exists and is paid
  SELECT id, is_paid, title INTO v_formation
  FROM public.formations
  WHERE id = p_formation_id;

  IF v_formation IS NULL THEN
    RAISE EXCEPTION 'Formation not found';
  END IF;

  -- Insert enrollment
  INSERT INTO public.formation_progress (user_id, formation_id, progress_percent, completed)
  VALUES (p_user_id, p_formation_id, 0, false)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_progress_id;

  RETURN v_progress_id;
END;
$$;