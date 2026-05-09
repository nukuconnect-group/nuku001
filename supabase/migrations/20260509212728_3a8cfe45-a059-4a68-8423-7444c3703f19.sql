CREATE TABLE IF NOT EXISTS public.moneroo_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','initiated','success','failed','cancelled','expired')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  context text NOT NULL DEFAULT 'direct',
  context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  checkout_url text,
  description text,
  customer_email text,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moneroo_transactions_user_created ON public.moneroo_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moneroo_transactions_status ON public.moneroo_transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moneroo_transactions_context ON public.moneroo_transactions(context, created_at DESC);

ALTER TABLE public.moneroo_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own Moneroo transactions" ON public.moneroo_transactions;
CREATE POLICY "Users can view own Moneroo transactions"
  ON public.moneroo_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all Moneroo transactions" ON public.moneroo_transactions;
CREATE POLICY "Admins can view all Moneroo transactions"
  ON public.moneroo_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_moneroo_transactions_updated_at ON public.moneroo_transactions;
CREATE TRIGGER update_moneroo_transactions_updated_at
  BEFORE UPDATE ON public.moneroo_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_set_user_subscription(
  p_user_id uuid,
  p_plan text,
  p_billing_period text DEFAULT 'monthly'::text,
  p_duration_days integer DEFAULT 365,
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_max_products integer;
  v_bonus_tokens integer;
  v_expires timestamptz;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_plan = 'pro' THEN v_plan := 'standard'; END IF;
  IF v_plan = 'business' THEN v_plan := 'enterprise'; END IF;

  IF v_plan NOT IN ('free','starter','standard','premium','enterprise') THEN
    RAISE EXCEPTION 'invalid plan';
  END IF;

  v_max_products := CASE v_plan
    WHEN 'free' THEN 5
    WHEN 'starter' THEN 15
    WHEN 'standard' THEN 30
    WHEN 'premium' THEN 9999
    WHEN 'enterprise' THEN 9999
  END;

  v_bonus_tokens := CASE v_plan
    WHEN 'starter' THEN 4
    WHEN 'standard' THEN 8
    WHEN 'premium' THEN 20
    WHEN 'enterprise' THEN 50
    ELSE 0
  END;

  v_expires := CASE
    WHEN v_plan = 'free' THEN now() + interval '30 days'
    ELSE now() + (greatest(coalesce(p_duration_days, 365), 1) || ' days')::interval
  END;

  INSERT INTO public.subscriptions (user_id, plan, billing_period, max_products, status, started_at, expires_at)
  VALUES (p_user_id, v_plan, coalesce(p_billing_period, 'monthly'), v_max_products, 'active', now(), v_expires)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        billing_period = EXCLUDED.billing_period,
        max_products = EXCLUDED.max_products,
        status = 'active',
        started_at = now(),
        expires_at = EXCLUDED.expires_at,
        updated_at = now();

  IF v_bonus_tokens > 0 THEN
    PERFORM public.admin_credit_tokens(p_user_id, v_bonus_tokens, 'subscription_bonus_' || v_plan);
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, target_user_id, action, reason, details)
  VALUES (v_admin, p_user_id, 'set_subscription', p_reason,
    jsonb_build_object(
      'plan', v_plan,
      'billing_period', coalesce(p_billing_period, 'monthly'),
      'duration_days', greatest(coalesce(p_duration_days, 365), 1),
      'max_products', v_max_products,
      'bonus_tokens', v_bonus_tokens,
      'expires_at', v_expires
    ));

  RETURN jsonb_build_object(
    'success', true,
    'plan', v_plan,
    'max_products', v_max_products,
    'bonus_tokens', v_bonus_tokens,
    'expires_at', v_expires
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_republish_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_reason text DEFAULT 'Republié par l''administrateur après correction'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_product record;
  v_owner record;
  v_attempt integer;
  v_approved_at timestamptz := now();
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF v_product IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF length(trim(coalesce(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'invalid_product_name';
  END IF;

  SELECT user_id, full_name INTO v_owner FROM public.profiles WHERE id = v_product.producer_id;

  SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt
  FROM public.moderation_logs WHERE product_id = p_product_id;

  UPDATE public.products
  SET name = trim(p_name),
      description = coalesce(p_description, ''),
      status = 'approved',
      moderation_status = 'approved',
      moderation_reason = NULL,
      moderated_at = v_approved_at,
      moderation_scheduled_at = NULL,
      updated_at = v_approved_at
  WHERE id = p_product_id;

  INSERT INTO public.moderation_logs (
    product_id,
    attempt_number,
    decision,
    reason,
    confidence,
    raw_response,
    prompt_summary
  ) VALUES (
    p_product_id,
    v_attempt,
    'approved',
    coalesce(p_reason, 'Republié par l''administrateur après correction'),
    1,
    jsonb_build_object(
      'action', 'admin_republish',
      'admin_id', v_admin,
      'approved_at', v_approved_at,
      'old_content', jsonb_build_object(
        'name', v_product.name,
        'description', v_product.description,
        'status', v_product.status,
        'moderation_status', v_product.moderation_status,
        'moderation_reason', v_product.moderation_reason
      ),
      'new_content', jsonb_build_object(
        'name', trim(p_name),
        'description', coalesce(p_description, ''),
        'status', 'approved',
        'moderation_status', 'approved'
      )
    ),
    'Admin override: ancien et nouveau contenu enregistrés avant republication'
  );

  IF v_owner.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, description, product_id)
    VALUES (
      v_owner.user_id,
      'product',
      '✅ Produit republié par l''admin',
      'Votre produit "' || trim(p_name) || '" a été corrigé et approuvé. Il est maintenant visible sur la marketplace.',
      p_product_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'owner_user_id', v_owner.user_id,
    'owner_name', v_owner.full_name,
    'approved_at', v_approved_at,
    'attempt_number', v_attempt,
    'old_content', jsonb_build_object('name', v_product.name, 'description', v_product.description),
    'new_content', jsonb_build_object('name', trim(p_name), 'description', coalesce(p_description, ''))
  );
END;
$$;