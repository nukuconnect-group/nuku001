-- RPC publique pour suivre une commande sans être connecté
-- Vérifie que l'ID de commande correspond bien à l'email du buyer (via auth.users)
CREATE OR REPLACE FUNCTION public.track_order_public(p_order_id uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_email text;
  v_product record;
  v_delivery record;
  v_seller text;
BEGIN
  IF p_order_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('error', 'missing_params');
  END IF;

  SELECT o.* INTO v_order FROM public.orders o WHERE o.id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Récupérer l'email du buyer via le profile -> user_id -> auth.users
  SELECT au.email INTO v_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.id = v_order.buyer_id;

  IF v_email IS NULL OR lower(v_email) <> lower(trim(p_email)) THEN
    RETURN jsonb_build_object('error', 'email_mismatch');
  END IF;

  SELECT name, images, category, unit, price, location INTO v_product
  FROM public.products WHERE id = v_order.product_id;

  SELECT full_name INTO v_seller
  FROM public.profiles WHERE id = v_order.seller_id;

  SELECT id, status, driver_id, pickup_address, dropoff_address,
         driver_current_lat, driver_current_lng, estimated_minutes,
         picked_up_at, delivered_at, accepted_at
  INTO v_delivery
  FROM public.deliveries WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'order', jsonb_build_object(
      'id', v_order.id,
      'status', v_order.status,
      'quantity', v_order.quantity,
      'total_price', v_order.total_price,
      'created_at', v_order.created_at,
      'updated_at', v_order.updated_at
    ),
    'product', to_jsonb(v_product),
    'seller_name', v_seller,
    'delivery', to_jsonb(v_delivery)
  );
END;
$$;

-- Permettre l'appel anonyme
GRANT EXECUTE ON FUNCTION public.track_order_public(uuid, text) TO anon, authenticated;