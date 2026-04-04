
-- Fix driver_profiles: restrict the broad SELECT policy
-- Remove the policy that exposes all columns to any authenticated user
DROP POLICY IF EXISTS "Authenticated can view safe driver fields" ON public.driver_profiles;

-- Only the driver themselves and buyers with active deliveries can see full driver profile
-- (GPS coordinates needed for live tracking)
CREATE POLICY "Buyers can view driver for active delivery"
ON public.driver_profiles FOR SELECT TO authenticated
USING (
  id IN (
    SELECT d.driver_id FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    JOIN profiles p ON p.id = o.buyer_id
    WHERE p.user_id = auth.uid()
    AND d.status NOT IN ('delivered', 'cancelled')
  )
);
