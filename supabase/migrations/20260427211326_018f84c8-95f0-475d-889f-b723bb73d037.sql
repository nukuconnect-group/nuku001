
-- Aggregator of recent actions for admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_recent_actions(
  p_limit integer DEFAULT 200,
  p_since timestamptz DEFAULT (now() - interval '30 days'),
  p_until timestamptz DEFAULT now(),
  p_type text DEFAULT NULL,            -- 'signup','email_confirmed','order','product','withdrawal','subscription','audit', NULL = all
  p_user_email text DEFAULT NULL       -- partial match on user email
)
RETURNS TABLE (
  action_type text,
  action_time timestamptz,
  user_id uuid,
  user_email text,
  user_name text,
  title text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH unioned AS (
    -- Signups
    SELECT
      'signup'::text AS action_type,
      u.created_at AS action_time,
      u.id AS user_id,
      u.email::text AS user_email,
      COALESCE(p.full_name, u.email::text) AS user_name,
      'Inscription'::text AS title,
      jsonb_build_object('user_type', p.user_type) AS details
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id

    UNION ALL

    -- Email confirmations
    SELECT
      'email_confirmed'::text,
      u.email_confirmed_at,
      u.id,
      u.email::text,
      COALESCE(p.full_name, u.email::text),
      'Email confirmé'::text,
      jsonb_build_object('confirmed_at', u.email_confirmed_at)
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.email_confirmed_at IS NOT NULL

    UNION ALL

    -- Orders
    SELECT
      'order'::text,
      o.created_at,
      bp.user_id,
      bu.email::text,
      COALESCE(bp.full_name, bu.email::text),
      'Commande #' || LEFT(o.id::text, 8),
      jsonb_build_object('total', o.total_price, 'status', o.status, 'product_id', o.product_id)
    FROM public.orders o
    LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
    LEFT JOIN auth.users bu ON bu.id = bp.user_id

    UNION ALL

    -- Products published
    SELECT
      'product'::text,
      pr.created_at,
      pf.user_id,
      pu.email::text,
      COALESCE(pf.full_name, pu.email::text),
      'Produit: ' || pr.name,
      jsonb_build_object('product_id', pr.id, 'category', pr.category, 'price', pr.price)
    FROM public.products pr
    LEFT JOIN public.profiles pf ON pf.id = pr.producer_id
    LEFT JOIN auth.users pu ON pu.id = pf.user_id

    UNION ALL

    -- Withdrawals
    SELECT
      'withdrawal'::text,
      w.created_at,
      w.user_id,
      wu.email::text,
      COALESCE(wp.full_name, wu.email::text),
      'Retrait ' || w.amount::text || ' FCFA',
      jsonb_build_object('status', w.status, 'operator', w.operator)
    FROM public.withdrawals w
    LEFT JOIN auth.users wu ON wu.id = w.user_id
    LEFT JOIN public.profiles wp ON wp.user_id = w.user_id

    UNION ALL

    -- Subscriptions
    SELECT
      'subscription'::text,
      s.updated_at,
      s.user_id,
      su.email::text,
      COALESCE(sp.full_name, su.email::text),
      'Abonnement: ' || s.plan,
      jsonb_build_object('plan', s.plan, 'status', s.status, 'expires_at', s.expires_at)
    FROM public.subscriptions s
    LEFT JOIN auth.users su ON su.id = s.user_id
    LEFT JOIN public.profiles sp ON sp.user_id = s.user_id

    UNION ALL

    -- Admin audit
    SELECT
      'audit'::text,
      a.created_at,
      a.target_user_id,
      au.email::text,
      COALESCE(ap.full_name, au.email::text),
      'Action admin: ' || a.action,
      a.details
    FROM public.admin_audit_log a
    LEFT JOIN auth.users au ON au.id = a.target_user_id
    LEFT JOIN public.profiles ap ON ap.user_id = a.target_user_id
  )
  SELECT *
  FROM unioned
  WHERE action_time >= p_since
    AND action_time <= p_until
    AND (p_type IS NULL OR action_type = p_type)
    AND (p_user_email IS NULL OR user_email ILIKE '%' || p_user_email || '%')
  ORDER BY action_time DESC
  LIMIT p_limit;
END;
$$;

-- Email confirmation status list
CREATE OR REPLACE FUNCTION public.get_admin_email_confirmations(
  p_limit integer DEFAULT 200,
  p_status text DEFAULT NULL  -- 'confirmed','pending', NULL = all
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  user_type text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  is_confirmed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(p.full_name, u.email::text),
    p.user_type,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    (u.email_confirmed_at IS NOT NULL) AS is_confirmed
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE
    (p_status IS NULL)
    OR (p_status = 'confirmed' AND u.email_confirmed_at IS NOT NULL)
    OR (p_status = 'pending' AND u.email_confirmed_at IS NULL)
  ORDER BY u.created_at DESC
  LIMIT p_limit;
END;
$$;
