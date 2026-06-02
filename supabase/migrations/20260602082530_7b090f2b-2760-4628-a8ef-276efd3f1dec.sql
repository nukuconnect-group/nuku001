
-- =============== LOT 2: Products geolocation ===============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS quarter text;

-- =============== LOT 3: Public username ===============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- =============== LOT 4: Affiliate attribution ===============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS affiliate_code text;

ALTER TABLE public.formation_payments
  ADD COLUMN IF NOT EXISTS affiliate_code text;

-- =============== LOT 4: wallet_movements ===============
CREATE TABLE IF NOT EXISTS public.wallet_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  type text NOT NULL CHECK (type IN ('credit','commission','withdrawal','refund','adjustment')),
  amount numeric NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_movements TO authenticated;
GRANT ALL ON public.wallet_movements TO service_role;

ALTER TABLE public.wallet_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet movements"
  ON public.wallet_movements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all wallet movements"
  ON public.wallet_movements FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_wallet_movements_user ON public.wallet_movements(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_wallet_balance(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE WHEN type IN ('credit','refund','adjustment') THEN amount
         WHEN type IN ('commission','withdrawal') THEN -amount
         ELSE 0 END
  ), 0)::numeric
  FROM public.wallet_movements
  WHERE user_id = _user_id;
$$;

-- =============== LOT 4: tracking_pixels ===============
CREATE TABLE IF NOT EXISTS public.tracking_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('meta','tiktok','ga4','gtm','snapchat')),
  pixel_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracking_pixels TO authenticated;
GRANT ALL ON public.tracking_pixels TO service_role;

ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pixels select"
  ON public.tracking_pixels FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own pixels insert"
  ON public.tracking_pixels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own pixels update"
  ON public.tracking_pixels FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own pixels delete"
  ON public.tracking_pixels FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all pixels"
  ON public.tracking_pixels FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tracking_pixels_updated_at
  BEFORE UPDATE ON public.tracking_pixels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
