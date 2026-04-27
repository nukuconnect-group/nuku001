ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boosted_until timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_demands_boosted_active
  ON public.demands (boosted_until DESC)
  WHERE is_boosted = true;