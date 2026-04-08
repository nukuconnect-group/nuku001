ALTER TABLE public.driver_kyc_submissions
  ADD COLUMN IF NOT EXISTS license_plate text,
  ADD COLUMN IF NOT EXISTS vehicle_brand text,
  ADD COLUMN IF NOT EXISTS vehicle_color text;