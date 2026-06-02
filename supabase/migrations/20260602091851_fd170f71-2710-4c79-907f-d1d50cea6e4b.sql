CREATE OR REPLACE FUNCTION public.get_my_orders_with_tracking()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(order_payload ORDER BY (order_payload->>'created_at')::timestamptz DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', o.id,
      'buyer_id', o.buyer_id,
      'seller_id', o.seller_id,
      'product_id', o.product_id,
      'quantity', o.quantity,
      'total_price', o.total_price,
      'status', o.status,
      'delivery_method', o.delivery_method,
      'notes', o.notes,
      'seller_confirmed_at', o.seller_confirmed_at,
      'created_at', o.created_at,
      'updated_at', o.updated_at,
      'products', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'images', p.images,
        'price', p.price,
        'unit', p.unit,
        'category', p.category,
        'location', p.location
      ) END,
      'buyer', CASE WHEN bp.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', bp.id,
        'full_name', bp.full_name,
        'display_name', bp.display_name,
        'business_name', bp.business_name,
        'avatar_url', bp.avatar_url,
        'location', bp.location
      ) END,
      'seller', CASE WHEN sp.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', sp.id,
        'full_name', sp.full_name,
        'display_name', sp.display_name,
        'business_name', sp.business_name,
        'avatar_url', sp.avatar_url,
        'location', sp.location
      ) END,
      'deliveries', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id,
          'order_id', d.order_id,
          'status', d.status,
          'driver_id', d.driver_id,
          'delivery_fee', d.delivery_fee,
          'driver_current_lat', d.driver_current_lat,
          'driver_current_lng', d.driver_current_lng,
          'pickup_address', d.pickup_address,
          'dropoff_address', d.dropoff_address,
          'accepted_at', d.accepted_at,
          'picked_up_at', d.picked_up_at,
          'delivered_at', d.delivered_at,
          'created_at', d.created_at,
          'updated_at', d.updated_at
        ) ORDER BY d.created_at DESC)
        FROM public.deliveries d
        WHERE d.order_id = o.id
      ), '[]'::jsonb)
    ) AS order_payload
    FROM public.orders o
    LEFT JOIN public.products p ON p.id = o.product_id
    LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
    LEFT JOIN public.profiles sp ON sp.id = o.seller_id
    WHERE EXISTS (
      SELECT 1
      FROM public.profiles current_profile
      WHERE current_profile.user_id = auth.uid()
        AND current_profile.id IN (o.buyer_id, o.seller_id)
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  ) orders_json;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_orders_with_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders_with_tracking() TO service_role;

DROP POLICY IF EXISTS "Sellers can view own deliveries" ON public.deliveries;
CREATE POLICY "Sellers can view own deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT o.id
    FROM public.orders o
    JOIN public.profiles p ON p.id = o.seller_id
    WHERE p.user_id = auth.uid()
  )
);