CREATE OR REPLACE FUNCTION public.get_admin_subscriptions()
 RETURNS SETOF json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT json_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'plan', s.plan,
    'status', s.status,
    'billing_period', s.billing_period,
    'max_products', s.max_products,
    'started_at', s.started_at,
    'expires_at', s.expires_at,
    'user_name', p.full_name,
    'user_type', p.user_type,
    'user_phone', pp.phone,
    'user_email', u.email,
    'token_balance', COALESCE(public.get_user_token_balance(s.user_id), 0)
  )
  FROM public.subscriptions s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN public.profile_private pp ON pp.user_id = s.user_id
  LEFT JOIN auth.users u ON u.id = s.user_id
  ORDER BY s.created_at DESC;
END;
$function$;