-- Drop the restrictive policy and replace with a broader one
DROP POLICY IF EXISTS "Authenticated can view available drivers" ON public.driver_profiles;

CREATE POLICY "Authenticated can view all driver profiles"
  ON public.driver_profiles
  FOR SELECT
  TO authenticated
  USING (true);