
-- Paliers de prix dégressifs par produit (style Alibaba)
CREATE TABLE IF NOT EXISTS public.product_price_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity NUMERIC NOT NULL DEFAULT 1,
  max_quantity NUMERIC,
  price NUMERIC NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_tiers_product ON public.product_price_tiers(product_id, sort_order);

ALTER TABLE public.product_price_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tiers viewable by everyone" ON public.product_price_tiers;
CREATE POLICY "Tiers viewable by everyone"
ON public.product_price_tiers FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Producers manage own tiers" ON public.product_price_tiers;
CREATE POLICY "Producers manage own tiers"
ON public.product_price_tiers FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.products p
  JOIN public.profiles pr ON pr.id = p.producer_id
  WHERE p.id = product_price_tiers.product_id AND pr.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products p
  JOIN public.profiles pr ON pr.id = p.producer_id
  WHERE p.id = product_price_tiers.product_id AND pr.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins manage all tiers" ON public.product_price_tiers;
CREATE POLICY "Admins manage all tiers"
ON public.product_price_tiers FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_price_tiers_updated_at
BEFORE UPDATE ON public.product_price_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
