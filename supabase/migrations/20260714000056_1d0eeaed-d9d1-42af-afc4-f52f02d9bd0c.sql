
-- 1. Remove user-side INSERT policy for certificates (only service_role/SECURITY DEFINER may issue)
DROP POLICY IF EXISTS "System can insert certificates" ON public.certificates;

-- 2. Prevent users from arbitrarily setting completed/progress_percent on formation_progress.
-- Create a trigger that blocks changes to these sensitive fields unless done in a SECURITY DEFINER context
-- (session_replication_role = 'replica' OR current_user is a privileged role).
CREATE OR REPLACE FUNCTION public.enforce_formation_progress_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Allow privileged roles (service_role, postgres) and SECURITY DEFINER callers to bypass
  IF current_setting('role', true) IN ('service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- On insert by a normal user, force safe defaults
    NEW.completed := COALESCE(false, NEW.completed);
    NEW.progress_percent := 0;
    NEW.completed_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Users cannot mark themselves complete or change progress directly
    IF NEW.completed IS DISTINCT FROM OLD.completed
       OR NEW.progress_percent IS DISTINCT FROM OLD.progress_percent
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Direct modification of completion/progress fields is not allowed. Use the dedicated tracking function.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_formation_progress_integrity_trg ON public.formation_progress;
CREATE TRIGGER enforce_formation_progress_integrity_trg
BEFORE INSERT OR UPDATE ON public.formation_progress
FOR EACH ROW
EXECUTE FUNCTION public.enforce_formation_progress_integrity();

-- 3. SECURITY DEFINER function to record real progress based on completed modules ratio
CREATE OR REPLACE FUNCTION public.record_module_completion(_formation_id uuid, _module_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total int;
  _done int;
  _pct int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Ensure module belongs to formation
  IF NOT EXISTS (SELECT 1 FROM public.formation_modules WHERE id = _module_id AND formation_id = _formation_id) THEN
    RAISE EXCEPTION 'Invalid module' USING ERRCODE = '22023';
  END IF;

  -- Upsert module completion row
  INSERT INTO public.formation_progress (user_id, formation_id, module_id, completed, progress_percent, completed_at)
  VALUES (_uid, _formation_id, _module_id, true, 100, now())
  ON CONFLICT (user_id, formation_id, module_id) DO UPDATE
    SET completed = true, progress_percent = 100, completed_at = COALESCE(public.formation_progress.completed_at, now());

  -- Recompute aggregate progress on the formation-level row (module_id IS NULL)
  SELECT COUNT(*) INTO _total FROM public.formation_modules WHERE formation_id = _formation_id;
  SELECT COUNT(*) INTO _done FROM public.formation_progress
    WHERE user_id = _uid AND formation_id = _formation_id AND module_id IS NOT NULL AND completed = true;

  _pct := CASE WHEN _total > 0 THEN LEAST(100, (_done * 100) / _total) ELSE 0 END;

  UPDATE public.formation_progress
    SET progress_percent = _pct,
        completed = (_pct >= 100),
        completed_at = CASE WHEN _pct >= 100 THEN COALESCE(completed_at, now()) ELSE completed_at END
    WHERE user_id = _uid AND formation_id = _formation_id AND module_id IS NULL;

  -- Issue certificate on full completion (idempotent)
  IF _pct >= 100 THEN
    INSERT INTO public.certificates (user_id, formation_id)
    SELECT _uid, _formation_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.certificates WHERE user_id = _uid AND formation_id = _formation_id
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_module_completion(uuid, uuid) TO authenticated;
