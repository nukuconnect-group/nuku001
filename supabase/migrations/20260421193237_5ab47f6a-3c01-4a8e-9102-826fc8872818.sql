-- Add moderation status to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- Backfill existing products as approved (they were already live)
UPDATE public.products SET moderation_status = 'approved', moderated_at = now() WHERE moderation_status = 'pending' AND created_at < now() - interval '1 hour';

-- Index for cron scanning
CREATE INDEX IF NOT EXISTS idx_products_moderation_pending 
  ON public.products(moderation_scheduled_at) 
  WHERE moderation_status = 'pending';

-- Update the public-viewable RLS so non-owners only see approved products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

CREATE POLICY "Approved products viewable by everyone"
ON public.products
FOR SELECT
USING (
  moderation_status = 'approved'
  OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = products.producer_id AND profiles.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Trigger to set moderation_scheduled_at on insert (20 minutes delay)
CREATE OR REPLACE FUNCTION public.schedule_product_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.moderation_status IS NULL OR NEW.moderation_status = 'pending' THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_scheduled_at := now() + interval '20 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_product_moderation ON public.products;
CREATE TRIGGER trg_schedule_product_moderation
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_product_moderation();

-- Helper RPC to fetch products due for moderation (used by cron edge function)
CREATE OR REPLACE FUNCTION public.get_products_due_for_moderation(p_limit integer DEFAULT 20)
RETURNS SETOF public.products
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.products
  WHERE moderation_status = 'pending'
    AND moderation_scheduled_at IS NOT NULL
    AND moderation_scheduled_at <= now()
  ORDER BY moderation_scheduled_at ASC
  LIMIT p_limit;
$$;