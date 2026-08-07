ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS auto_sourcing boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.demand_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  supplier_user_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  delivery_days integer,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demand_id, supplier_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_offers TO authenticated;
GRANT ALL ON public.demand_offers TO service_role;

ALTER TABLE public.demand_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers manage their own offers"
  ON public.demand_offers FOR SELECT TO authenticated
  USING (supplier_user_id = auth.uid());

CREATE POLICY "Buyers view offers on their demands"
  ON public.demand_offers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.user_id = auth.uid()));

CREATE POLICY "Admins view all offers"
  ON public.demand_offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Suppliers create their own offers"
  ON public.demand_offers FOR INSERT TO authenticated
  WITH CHECK (
    supplier_user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.user_id <> auth.uid())
  );

CREATE POLICY "Suppliers update their pending offers"
  ON public.demand_offers FOR UPDATE TO authenticated
  USING (supplier_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (supplier_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Buyers decide on offers of their demands"
  ON public.demand_offers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.user_id = auth.uid()))
  WITH CHECK (
    status IN ('accepted', 'rejected', 'pending')
    AND EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Suppliers delete their pending offers"
  ON public.demand_offers FOR DELETE TO authenticated
  USING (supplier_user_id = auth.uid() AND status = 'pending');

CREATE INDEX IF NOT EXISTS demand_offers_demand_idx ON public.demand_offers (demand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS demand_offers_supplier_idx ON public.demand_offers (supplier_user_id, created_at DESC);

CREATE TRIGGER update_demand_offers_updated_at
  BEFORE UPDATE ON public.demand_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();