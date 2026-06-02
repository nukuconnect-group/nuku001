CREATE OR REPLACE FUNCTION public.confirm_seller_order(_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_seller_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  SELECT user_id INTO v_seller_user_id
  FROM public.profiles
  WHERE id = v_order.seller_id;

  IF v_seller_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF v_order.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être validée';
  END IF;

  UPDATE public.orders
  SET seller_confirmed_at = COALESCE(seller_confirmed_at, now()),
      updated_at = now()
  WHERE id = _order_id;

  RETURN json_build_object('success', true, 'order_id', _order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_seller_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(_order_id uuid, _status text, _note text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY['pending','confirmed','processing','shipped','completed','cancelled'];
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF _status IS NULL OR NOT (_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  UPDATE public.orders
  SET status = _status,
      notes = CASE WHEN _note IS NULL THEN notes ELSE _note END,
      seller_confirmed_at = CASE
        WHEN _status IN ('confirmed','processing','shipped','completed') THEN COALESCE(seller_confirmed_at, now())
        ELSE seller_confirmed_at
      END,
      updated_at = now()
  WHERE id = _order_id;

  RETURN json_build_object('success', true, 'order_id', _order_id, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_producers', (SELECT count(*) FROM public.profiles WHERE user_type = 'producer'),
    'total_buyers', (SELECT count(*) FROM public.profiles WHERE user_type = 'buyer'),
    'total_products', (SELECT count(*) FROM public.products),
    'total_orders', (SELECT count(*) FROM public.orders),
    'total_revenue', (SELECT COALESCE(sum(total_price), 0) FROM public.orders WHERE status IN ('confirmed','processing','shipped','completed','paid','delivered')),
    'pending_orders', (SELECT count(*) FROM public.orders WHERE status = 'pending'),
    'completed_orders', (SELECT count(*) FROM public.orders WHERE status IN ('completed','delivered')),
    'total_subscriptions', (SELECT count(*) FROM public.subscriptions),
    'pro_subscriptions', (SELECT count(*) FROM public.subscriptions WHERE plan = 'pro' AND status = 'active'),
    'free_subscriptions', (SELECT count(*) FROM public.subscriptions WHERE plan = 'free' AND status = 'active'),
    'total_conversations', (SELECT count(*) FROM public.conversations),
    'total_demands', (SELECT count(*) FROM public.demands WHERE status = 'active'),
    'total_reviews', (SELECT count(*) FROM public.reviews)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_orders()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT json_build_object(
    'id', o.id,
    'status', o.status,
    'total_price', o.total_price,
    'quantity', o.quantity,
    'notes', o.notes,
    'delivery_method', o.delivery_method,
    'seller_confirmed_at', o.seller_confirmed_at,
    'created_at', o.created_at,
    'product_name', pr.name,
    'product_category', pr.category,
    'buyer_name', bp.full_name,
    'seller_name', sp.full_name
  )
  FROM public.orders o
  LEFT JOIN public.products pr ON pr.id = o.product_id
  LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
  LEFT JOIN public.profiles sp ON sp.id = o.seller_id
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_orders() TO authenticated;