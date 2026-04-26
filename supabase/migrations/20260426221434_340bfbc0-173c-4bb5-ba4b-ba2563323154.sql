
-- 1. Audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_log(admin_id, created_at DESC);

-- 2. API key usage
CREATE TABLE IF NOT EXISTS public.api_key_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api usage" ON public.api_key_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all api usage" ON public.api_key_usage
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_api_key_usage_user ON public.api_key_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON public.api_key_usage(api_key_id, created_at DESC);

-- 3. Update admin_set_user_subscription with dedup + audit
CREATE OR REPLACE FUNCTION public.admin_set_user_subscription(
  p_user_id UUID,
  p_plan TEXT,
  p_billing_period TEXT DEFAULT 'monthly',
  p_duration_days INTEGER DEFAULT 30,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_max_products INTEGER;
  v_bonus_tokens INTEGER;
  v_expires TIMESTAMPTZ;
  v_current RECORD;
  v_days_diff INTEGER;
BEGIN
  IF NOT has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_plan NOT IN ('free','pro','premium','business') THEN
    RAISE EXCEPTION 'invalid plan';
  END IF;

  -- Anti-doublon : refuse si le plan actif est identique avec la même date d'expiration (±2 jours)
  SELECT plan, status, expires_at INTO v_current
  FROM public.subscriptions WHERE user_id = p_user_id;

  IF FOUND AND v_current.plan = p_plan AND v_current.status = 'active' THEN
    IF p_plan = 'free' THEN
      RAISE EXCEPTION 'duplicate_subscription:plan_already_active';
    END IF;
    IF v_current.expires_at IS NOT NULL THEN
      v_days_diff := ABS(EXTRACT(EPOCH FROM (v_current.expires_at - (now() + (p_duration_days || ' days')::interval))) / 86400)::INTEGER;
      IF v_days_diff <= 2 THEN
        RAISE EXCEPTION 'duplicate_subscription:identical_plan_and_duration';
      END IF;
    END IF;
  END IF;

  v_max_products := CASE p_plan
    WHEN 'free' THEN 3
    WHEN 'pro' THEN 50
    WHEN 'premium' THEN 200
    WHEN 'business' THEN 1000
  END;

  v_bonus_tokens := CASE p_plan
    WHEN 'pro' THEN 100
    WHEN 'premium' THEN 500
    WHEN 'business' THEN 2000
    ELSE 0
  END;

  v_expires := CASE WHEN p_plan = 'free' THEN NULL ELSE now() + (p_duration_days || ' days')::interval END;

  INSERT INTO public.subscriptions (user_id, plan, billing_period, max_products, status, started_at, expires_at)
  VALUES (p_user_id, p_plan, p_billing_period, v_max_products, 'active', now(), v_expires)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        billing_period = EXCLUDED.billing_period,
        max_products = EXCLUDED.max_products,
        status = 'active',
        started_at = now(),
        expires_at = EXCLUDED.expires_at,
        updated_at = now();

  IF v_bonus_tokens > 0 THEN
    PERFORM public.admin_credit_tokens(p_user_id, v_bonus_tokens, 'subscription_bonus_' || p_plan);
  END IF;

  -- Audit log
  INSERT INTO public.admin_audit_log (admin_id, target_user_id, action, reason, details)
  VALUES (v_admin, p_user_id, 'set_subscription', p_reason,
    jsonb_build_object(
      'plan', p_plan,
      'billing_period', p_billing_period,
      'duration_days', p_duration_days,
      'max_products', v_max_products,
      'bonus_tokens', v_bonus_tokens,
      'expires_at', v_expires
    ));

  RETURN jsonb_build_object(
    'success', true, 'plan', p_plan, 'max_products', v_max_products,
    'bonus_tokens', v_bonus_tokens, 'expires_at', v_expires
  );
END;
$$;

-- 4. Update admin_credit_tokens with audit log
CREATE OR REPLACE FUNCTION public.admin_credit_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'admin_grant'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF NOT has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  v_current_balance := COALESCE(public.get_user_token_balance(p_user_id), 0);
  v_new_balance := v_current_balance + p_amount;

  INSERT INTO public.token_transactions (user_id, type, amount, balance_after, reason, reference_type)
  VALUES (p_user_id, 'bonus', p_amount, v_new_balance, COALESCE(p_reason, 'admin_grant'), 'admin');

  INSERT INTO public.token_purchases (
    user_id, pack_code, tokens_purchased, tokens_remaining, price_fcfa,
    payment_status, payment_reference, completed_at, expires_at
  ) VALUES (
    p_user_id, 'admin_grant', p_amount, p_amount, 0,
    'completed', 'admin:' || v_admin::text, now(), now() + interval '365 days'
  );

  -- Audit (skip when called from subscription bonus to avoid duplicate noise)
  IF p_reason IS NULL OR p_reason NOT LIKE 'subscription_bonus_%' THEN
    INSERT INTO public.admin_audit_log (admin_id, target_user_id, action, reason, details)
    VALUES (v_admin, p_user_id, 'credit_tokens', p_reason,
      jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance));
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'credited', p_amount);
END;
$$;

-- 5. Validate API key (used by edge function)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE(user_id UUID, api_key_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.api_keys
     SET last_used_at = now()
   WHERE key_hash = p_key_hash AND is_active = true
   RETURNING api_keys.user_id, api_keys.id;
END;
$$;

-- 6. Log API call (used by edge function)
CREATE OR REPLACE FUNCTION public.log_api_call(
  p_api_key_id UUID,
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status INTEGER,
  p_ip TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.api_key_usage (api_key_id, user_id, endpoint, method, status_code, ip_address)
  VALUES (p_api_key_id, p_user_id, p_endpoint, p_method, p_status, p_ip);
$$;
