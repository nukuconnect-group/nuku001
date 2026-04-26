
-- 1. Table API keys (par utilisateur, gating au niveau application)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'API Key',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api keys" ON public.api_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own api keys" ON public.api_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own api keys" ON public.api_keys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own api keys" ON public.api_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all api keys" ON public.api_keys
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);

-- 2. Fonction admin: créditer des jetons à n'importe quel utilisateur
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

  -- crédit conservé via une "purchase" virtuelle pour que get_user_token_balance reflète
  INSERT INTO public.token_purchases (
    user_id, pack_code, tokens_purchased, tokens_remaining, price_fcfa,
    payment_status, payment_reference, completed_at, expires_at
  ) VALUES (
    p_user_id, 'admin_grant', p_amount, p_amount, 0,
    'completed', 'admin:' || v_admin::text, now(), now() + interval '365 days'
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'credited', p_amount);
END;
$$;

-- 3. Fonction admin: attribuer/changer abonnement utilisateur (avec bonus jetons)
CREATE OR REPLACE FUNCTION public.admin_set_user_subscription(
  p_user_id UUID,
  p_plan TEXT,
  p_billing_period TEXT DEFAULT 'monthly',
  p_duration_days INTEGER DEFAULT 30
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
BEGIN
  IF NOT has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_plan NOT IN ('free','pro','premium','business') THEN
    RAISE EXCEPTION 'invalid plan';
  END IF;

  -- mapping plan -> capacités
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

  -- upsert subscription
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

  -- bonus jetons si plan payant
  IF v_bonus_tokens > 0 THEN
    PERFORM public.admin_credit_tokens(p_user_id, v_bonus_tokens, 'subscription_bonus_' || p_plan);
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'plan', p_plan, 'max_products', v_max_products,
    'bonus_tokens', v_bonus_tokens, 'expires_at', v_expires
  );
END;
$$;

-- 4. Subscriptions: garantir contrainte unique pour upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;
