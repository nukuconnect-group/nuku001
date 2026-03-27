
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT json_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'full_name', p.full_name,
    'user_type', p.user_type,
    'phone', pp.phone,
    'location', p.location,
    'is_verified', p.is_verified,
    'avatar_url', p.avatar_url,
    'created_at', p.created_at,
    'products_count', (SELECT count(*) FROM public.products WHERE producer_id = p.id),
    'orders_count', (SELECT count(*) FROM public.orders WHERE buyer_id = p.id OR seller_id = p.id),
    'subscription', (SELECT json_build_object('plan', s.plan, 'status', s.status, 'max_products', s.max_products) FROM public.subscriptions s WHERE s.user_id = p.user_id LIMIT 1)
  )
  FROM public.profiles p
  LEFT JOIN public.profile_private pp ON pp.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;
