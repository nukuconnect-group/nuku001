CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, max_products, expires_at, free_renewals_used)
  VALUES (NEW.id, 'free', 5, now() + interval '30 days', 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

UPDATE public.subscriptions
SET expires_at = COALESCE(started_at, created_at, now()) + interval '30 days',
    updated_at = now()
WHERE plan = 'free'
  AND expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_free_plan_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_sub RECORD;
BEGIN
  SELECT plan, status, expires_at, free_renewals_used, max_products INTO v_sub
  FROM public.subscriptions WHERE user_id = p_user_id;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;
  RETURN jsonb_build_object(
    'exists', true,
    'plan', v_sub.plan,
    'status', v_sub.status,
    'expires_at', v_sub.expires_at,
    'free_renewals_used', v_sub.free_renewals_used,
    'renewals_remaining', GREATEST(0, 2 - v_sub.free_renewals_used),
    'is_expired', (v_sub.expires_at IS NOT NULL AND v_sub.expires_at <= now()),
    'can_renew', (v_sub.plan = 'free' AND v_sub.free_renewals_used < 2 AND v_sub.expires_at IS NOT NULL AND v_sub.expires_at <= now()),
    'total_free_months', 1 + LEAST(2, v_sub.free_renewals_used)
  );
END;
$$;