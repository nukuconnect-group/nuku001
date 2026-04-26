-- 1. Add shipping_delay_days to products (0 = immediate, 1 = 24h, etc.)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_delay_days integer NOT NULL DEFAULT 1;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_shipping_delay_days_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_shipping_delay_days_check
  CHECK (shipping_delay_days >= 0 AND shipping_delay_days <= 30);

-- 2. Trigger to enforce business_name on new producer/supplier profiles
-- (does not block existing rows; only on INSERT or when user_type is changed to producer)
CREATE OR REPLACE FUNCTION public.enforce_business_name_for_producers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type IN ('producer','trainer') THEN
    IF NEW.business_name IS NULL OR length(trim(NEW.business_name)) = 0 THEN
      -- Fallback to full_name if missing, never block — UI is the strict gate
      NEW.business_name := COALESCE(NEW.business_name, NEW.full_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_name ON public.profiles;
CREATE TRIGGER trg_enforce_business_name
  BEFORE INSERT OR UPDATE OF user_type, business_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_name_for_producers();