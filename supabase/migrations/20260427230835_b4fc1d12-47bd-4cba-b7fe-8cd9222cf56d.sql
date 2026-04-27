-- Add timezone & availability hours to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Lome',
  ADD COLUMN IF NOT EXISTS availability_start text DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS availability_end text DEFAULT '20:00';

-- Update get_admin_users to include email, timezone, availability
CREATE OR REPLACE FUNCTION public.get_admin_users()
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
    'id', p.id,
    'user_id', p.user_id,
    'full_name', p.full_name,
    'user_type', p.user_type,
    'email', u.email,
    'phone', pp.phone,
    'location', p.location,
    'timezone', p.timezone,
    'availability_start', p.availability_start,
    'availability_end', p.availability_end,
    'is_verified', p.is_verified,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'business_name', p.business_name,
    'created_at', p.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed_at', u.email_confirmed_at,
    'banned_until', u.banned_until,
    'products_count', (SELECT count(*) FROM public.products WHERE producer_id = p.id),
    'orders_count', (SELECT count(*) FROM public.orders WHERE buyer_id = p.id OR seller_id = p.id),
    'subscription', (SELECT json_build_object('plan', s.plan, 'status', s.status, 'max_products', s.max_products, 'expires_at', s.expires_at) FROM public.subscriptions s WHERE s.user_id = p.user_id LIMIT 1)
  )
  FROM public.profiles p
  LEFT JOIN public.profile_private pp ON pp.user_id = p.user_id
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$function$;