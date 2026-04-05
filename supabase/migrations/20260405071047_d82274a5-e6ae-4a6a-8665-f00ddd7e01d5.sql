
-- Drop the view since we'll use an RPC instead
DROP VIEW IF EXISTS public.active_boosts_public;

-- Create a secure function that returns only product_ids of active boosts
CREATE OR REPLACE FUNCTION public.get_boosted_product_ids()
RETURNS TABLE(product_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT product_id
  FROM public.product_boosts
  WHERE is_active = true
    AND expires_at > now();
$$;

-- Drop the duplicate policy if it exists (we already have "Users can view own boosts")
DROP POLICY IF EXISTS "Users can view own boosts including active" ON public.product_boosts;
