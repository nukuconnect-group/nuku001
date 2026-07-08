
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_view_count ON public.products(view_count DESC);

CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.products
  SET view_count = view_count + 1
  WHERE id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_product_click(p_product_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.products
  SET click_count = click_count + 1
  WHERE id = p_product_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_click(uuid) TO anon, authenticated;
