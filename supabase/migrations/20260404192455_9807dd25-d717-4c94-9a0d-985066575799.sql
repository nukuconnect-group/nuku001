
-- =============================================
-- 1. FIX STORAGE: Scope product-images uploads
-- =============================================

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

-- Create scoped INSERT policy (user can only upload to their own folder)
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add scoped UPDATE policy
CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- =============================================
-- 2. FIX DRIVER PROFILES: Restrict sensitive data
-- =============================================

-- Remove the broad SELECT policy
DROP POLICY IF EXISTS "Authenticated can view all driver profiles" ON public.driver_profiles;

-- Create a public view with only safe fields
CREATE OR REPLACE VIEW public.driver_profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  profile_id,
  user_id,
  vehicle_type,
  zone,
  is_available,
  rating,
  total_deliveries
FROM public.driver_profiles;

-- Allow all authenticated users to see limited driver info via the view
CREATE POLICY "Authenticated can view safe driver fields"
ON public.driver_profiles FOR SELECT TO authenticated
USING (
  -- Own profile
  user_id = auth.uid()
  -- OR driver is available (for marketplace listing, but view hides sensitive cols)
  OR is_available = true
  -- OR driver is assigned to user's active delivery
  OR id IN (
    SELECT d.driver_id FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    JOIN profiles p ON p.id = o.buyer_id
    WHERE p.user_id = auth.uid()
      AND d.status NOT IN ('delivered', 'cancelled')
  )
);
