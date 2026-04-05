
-- Drop the overly permissive policy that exposes all columns of active boosts
DROP POLICY IF EXISTS "Anyone can check active boost status" ON public.product_boosts;

-- Create a restricted view that only exposes safe fields
CREATE OR REPLACE VIEW public.active_boosts_public AS
SELECT product_id, is_active
FROM public.product_boosts
WHERE is_active = true;

-- Re-create the policy scoped to the owning user only
-- Other users should use the view above for checking boost status
CREATE POLICY "Users can view own boosts including active"
ON public.product_boosts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
