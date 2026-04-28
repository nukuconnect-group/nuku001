-- Function to check if the current authenticated user is allowed to read a formation's source document.
-- For free formations: any authenticated user can read.
-- For paid formations: only enrolled users (or admins) can read.
CREATE OR REPLACE FUNCTION public.can_access_formation_document(p_formation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_paid boolean;
  v_enrolled boolean;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_paid INTO v_is_paid FROM public.formations WHERE id = p_formation_id;
  IF v_is_paid IS NULL THEN
    RETURN false;
  END IF;

  -- Free formations: anyone authenticated may read the source document
  IF v_is_paid = false THEN
    RETURN true;
  END IF;

  -- Admins always have access
  IF public.has_role(v_user, 'admin') THEN
    RETURN true;
  END IF;

  -- Paid formations: check enrollment
  SELECT EXISTS (
    SELECT 1 FROM public.formation_progress
    WHERE user_id = v_user
      AND formation_id = p_formation_id
  ) INTO v_enrolled;

  RETURN COALESCE(v_enrolled, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_formation_document(uuid) TO authenticated;