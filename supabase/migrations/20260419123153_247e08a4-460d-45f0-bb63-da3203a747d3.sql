-- =====================================================
-- TOKEN SYSTEM (Jetons NukuConnect)
-- =====================================================

-- 1) Catalogue des packs
CREATE TABLE IF NOT EXISTS public.token_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_fcfa integer NOT NULL CHECK (price_fcfa > 0),
  tokens integer NOT NULL CHECK (tokens > 0),
  bonus_tokens integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packs"
  ON public.token_packs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage packs"
  ON public.token_packs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_token_packs_updated_at
  BEFORE UPDATE ON public.token_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed des 3 packs
INSERT INTO public.token_packs (code, name, price_fcfa, tokens, bonus_tokens, is_popular, description, sort_order) VALUES
  ('starter',  'Pack Starter',  2500,  4,  0, false, 'Idéal pour découvrir', 1),
  ('standard', 'Pack Standard', 5000,  8,  0, true,  'Le plus populaire',    2),
  ('premium',  'Pack Premium',  10000, 16, 4, false, '+4 jetons offerts !',  3)
ON CONFLICT (code) DO NOTHING;

-- 2) Achats de jetons (FIFO, expiration 12 mois)
CREATE TABLE IF NOT EXISTS public.token_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id uuid REFERENCES public.token_packs(id),
  pack_code text NOT NULL,
  tokens_purchased integer NOT NULL CHECK (tokens_purchased > 0),
  tokens_remaining integer NOT NULL CHECK (tokens_remaining >= 0),
  price_fcfa integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed','expired_payment')),
  payment_reference text,
  payment_identifier text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_purchases_user_active ON public.token_purchases(user_id, expires_at) WHERE payment_status='completed' AND tokens_remaining > 0;

ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
  ON public.token_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all purchases"
  ON public.token_purchases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Pas de policy INSERT/UPDATE/DELETE côté client : tout passe par functions SECURITY DEFINER.

CREATE TRIGGER update_token_purchases_updated_at
  BEFORE UPDATE ON public.token_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Historique transactions
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  purchase_id uuid REFERENCES public.token_purchases(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('purchase','spend','expire','bonus','refund')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reason text,
  reference_id uuid,
  reference_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_tx_user_created ON public.token_transactions(user_id, created_at DESC);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.token_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all transactions"
  ON public.token_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Solde actif (non-expiré + completed)
CREATE OR REPLACE FUNCTION public.get_user_token_balance(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(tokens_remaining), 0)::integer
  FROM public.token_purchases
  WHERE user_id = p_user_id
    AND payment_status = 'completed'
    AND expires_at > now()
    AND tokens_remaining > 0;
$$;

-- Crédit après paiement confirmé (idempotent par payment_identifier)
CREATE OR REPLACE FUNCTION public.complete_token_purchase(
  p_purchase_id uuid,
  p_payment_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
  v_balance integer;
BEGIN
  SELECT * INTO v_purchase FROM public.token_purchases WHERE id = p_purchase_id FOR UPDATE;
  IF v_purchase IS NULL THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;
  IF v_purchase.payment_status = 'completed' THEN
    RETURN jsonb_build_object('already_completed', true, 'balance', public.get_user_token_balance(v_purchase.user_id));
  END IF;

  UPDATE public.token_purchases
  SET payment_status = 'completed',
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      completed_at = now(),
      tokens_remaining = tokens_purchased
  WHERE id = p_purchase_id;

  v_balance := public.get_user_token_balance(v_purchase.user_id);

  INSERT INTO public.token_transactions (user_id, purchase_id, type, amount, balance_after, reason, reference_type)
  VALUES (v_purchase.user_id, p_purchase_id, 'purchase', v_purchase.tokens_purchased, v_balance,
          'Achat ' || v_purchase.pack_code, 'token_pack');

  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (v_purchase.user_id, 'tokens',
          '🎁 ' || v_purchase.tokens_purchased || ' jetons crédités',
          'Votre achat est confirmé. Solde actuel: ' || v_balance || ' jetons.');

  RETURN jsonb_build_object('success', true, 'balance', v_balance, 'credited', v_purchase.tokens_purchased);
END;
$$;

-- Débit FIFO atomique
CREATE OR REPLACE FUNCTION public.spend_user_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_remaining integer := p_amount;
  v_take integer;
  v_purchase RECORD;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  v_balance := public.get_user_token_balance(p_user_id);
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tokens', 'balance', v_balance, 'needed', p_amount);
  END IF;

  -- FIFO : on prend les achats expirant le plus tôt en premier
  FOR v_purchase IN
    SELECT id, tokens_remaining
    FROM public.token_purchases
    WHERE user_id = p_user_id
      AND payment_status = 'completed'
      AND expires_at > now()
      AND tokens_remaining > 0
    ORDER BY expires_at ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_purchase.tokens_remaining, v_remaining);
    UPDATE public.token_purchases SET tokens_remaining = tokens_remaining - v_take WHERE id = v_purchase.id;
    v_remaining := v_remaining - v_take;
  END LOOP;

  v_balance := public.get_user_token_balance(p_user_id);

  INSERT INTO public.token_transactions (user_id, type, amount, balance_after, reason, reference_id, reference_type)
  VALUES (p_user_id, 'spend', -p_amount, v_balance, p_reason, p_reference_id, p_reference_type);

  -- Alerte solde faible
  IF v_balance > 0 AND v_balance <= 2 THEN
    INSERT INTO public.notifications (user_id, type, title, description)
    VALUES (p_user_id, 'tokens', '⚠️ Solde de jetons faible',
            'Il vous reste ' || v_balance || ' jeton(s). Rechargez pour continuer à booster vos produits.');
  END IF;

  RETURN jsonb_build_object('success', true, 'balance', v_balance, 'spent', p_amount);
END;
$$;

-- Création d'un achat (appelée par edge function paygate-init token)
CREATE OR REPLACE FUNCTION public.create_token_purchase(
  p_pack_code text,
  p_payment_identifier text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pack RECORD;
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_pack FROM public.token_packs WHERE code = p_pack_code AND is_active = true;
  IF v_pack IS NULL THEN RAISE EXCEPTION 'Pack not found'; END IF;

  INSERT INTO public.token_purchases (user_id, pack_id, pack_code, tokens_purchased, tokens_remaining, price_fcfa, payment_identifier)
  VALUES (v_user, v_pack.id, v_pack.code, v_pack.tokens + v_pack.bonus_tokens, 0, v_pack.price_fcfa, p_payment_identifier)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Expiration (à appeler en cron)
CREATE OR REPLACE FUNCTION public.expire_old_tokens()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, user_id, tokens_remaining
    FROM public.token_purchases
    WHERE payment_status = 'completed' AND tokens_remaining > 0 AND expires_at <= now()
    FOR UPDATE
  LOOP
    INSERT INTO public.token_transactions (user_id, purchase_id, type, amount, balance_after, reason, reference_type)
    VALUES (r.user_id, r.id, 'expire', -r.tokens_remaining,
            public.get_user_token_balance(r.user_id) - r.tokens_remaining, 'Jetons expirés (12 mois)', 'expiration');

    UPDATE public.token_purchases SET tokens_remaining = 0 WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;