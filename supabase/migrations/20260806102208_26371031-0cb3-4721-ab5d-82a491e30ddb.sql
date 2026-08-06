-- 1. Driver KYC: only pending submissions can be edited by the owner
DROP POLICY IF EXISTS "Users can update own kyc" ON public.driver_kyc_submissions;
CREATE POLICY "Users can update own pending kyc"
ON public.driver_kyc_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 2. Products: prevent sellers from changing moderation columns themselves
CREATE OR REPLACE FUNCTION public.enforce_product_moderation_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (edge functions / moderation pipeline) and admins may change moderation fields
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.moderation_status := OLD.moderation_status;
  NEW.moderation_reason := OLD.moderation_reason;
  NEW.moderated_at := OLD.moderated_at;
  NEW.moderation_scheduled_at := OLD.moderation_scheduled_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_product_moderation_integrity ON public.products;
CREATE TRIGGER trg_enforce_product_moderation_integrity
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_product_moderation_integrity();

-- Scope the producer update policy to authenticated users only
DROP POLICY IF EXISTS "Producers can update their own products" ON public.products;
CREATE POLICY "Producers can update their own products"
ON public.products
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = products.producer_id AND profiles.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = products.producer_id AND profiles.user_id = auth.uid()));