-- Create a secure function that returns only safe driver fields for buyers with active deliveries
CREATE OR REPLACE FUNCTION public.get_driver_for_delivery(p_delivery_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  
  -- Verify the caller is the buyer for this delivery
  IF NOT EXISTS (
    SELECT 1 FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    JOIN profiles p ON p.id = o.buyer_id
    WHERE d.id = p_delivery_id
    AND p.user_id = caller_id
    AND d.status NOT IN ('delivered', 'cancelled')
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Return only safe fields plus live location for tracking
  SELECT json_build_object(
    'id', dp.id,
    'profile_id', dp.profile_id,
    'vehicle_type', dp.vehicle_type,
    'zone', dp.zone,
    'is_available', dp.is_available,
    'rating', dp.rating,
    'total_deliveries', dp.total_deliveries,
    'current_lat', dp.current_lat,
    'current_lng', dp.current_lng,
    'driver_name', pr.full_name,
    'avatar_url', pr.avatar_url
  ) INTO result
  FROM deliveries d
  JOIN driver_profiles dp ON dp.id = d.driver_id
  JOIN profiles pr ON pr.id = dp.profile_id
  WHERE d.id = p_delivery_id;
  
  RETURN result;
END;
$$;

-- Remove the broad buyer policy that exposes all columns
DROP POLICY IF EXISTS "Buyers can view driver for active delivery" ON public.driver_profiles;

-- Re-create a column-safe buyer policy that only allows access for tracking
-- but since RLS can't restrict columns, we rely on the RPC above for buyer access
-- and remove direct table access for buyers entirely
