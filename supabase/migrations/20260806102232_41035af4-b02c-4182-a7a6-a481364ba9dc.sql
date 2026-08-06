CREATE OR REPLACE FUNCTION public.enforce_product_moderation_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Sellers may only send a listing back to review; never self-approve.
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     AND NEW.moderation_status <> 'pending' THEN
    NEW.moderation_status := OLD.moderation_status;
  END IF;

  IF NEW.moderation_status = 'approved' THEN
    NEW.moderation_reason := OLD.moderation_reason;
    NEW.moderated_at := OLD.moderated_at;
  END IF;

  RETURN NEW;
END;
$$;