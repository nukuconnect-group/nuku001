
-- 1) Trigger : notification quand moderation_status passe à approved ou rejected
CREATE OR REPLACE FUNCTION public.notify_product_moderation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  producer_user_id uuid;
BEGIN
  IF OLD.moderation_status = NEW.moderation_status THEN RETURN NEW; END IF;
  IF NEW.moderation_status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;

  SELECT user_id INTO producer_user_id FROM public.profiles WHERE id = NEW.producer_id;
  IF producer_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, description, product_id)
  VALUES (
    producer_user_id,
    'product',
    CASE NEW.moderation_status
      WHEN 'approved' THEN '✅ Produit approuvé'
      ELSE '❌ Produit rejeté'
    END,
    CASE NEW.moderation_status
      WHEN 'approved' THEN 'Votre produit "' || NEW.name || '" est maintenant visible sur la marketplace.'
      ELSE 'Votre produit "' || NEW.name || '" a été refusé. Raison : ' || COALESCE(NEW.moderation_reason, 'Non conforme aux normes.')
    END,
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_product_moderation_change ON public.products;
CREATE TRIGGER trg_notify_product_moderation_change
  AFTER UPDATE OF moderation_status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_product_moderation_change();

-- 2) Fonction : renouveler le plan gratuit (max 2 renouvellements)
CREATE OR REPLACE FUNCTION public.renew_free_subscription()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_sub RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = v_user FOR UPDATE;
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_subscription');
  END IF;
  IF v_sub.plan <> 'free' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_free_plan');
  END IF;
  IF v_sub.free_renewals_used >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'max_renewals_reached', 'renewals_used', v_sub.free_renewals_used);
  END IF;

  UPDATE public.subscriptions
  SET expires_at = COALESCE(GREATEST(expires_at, now()), now()) + interval '30 days',
      free_renewals_used = free_renewals_used + 1,
      status = 'active',
      updated_at = now()
  WHERE user_id = v_user;

  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (v_user, 'system', '🎁 Plan gratuit renouvelé',
          'Votre plan gratuit est prolongé de 30 jours. Renouvellements restants : ' || (2 - (v_sub.free_renewals_used + 1))::text);

  RETURN jsonb_build_object('success', true, 'renewals_used', v_sub.free_renewals_used + 1, 'renewals_remaining', 2 - (v_sub.free_renewals_used + 1));
END;
$$;

-- 3) Fonction : retourne l'état du plan gratuit (utilisé côté UI)
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
    'can_renew', (v_sub.plan = 'free' AND v_sub.free_renewals_used < 2)
  );
END;
$$;

-- 4) Table : journal d'analyse IA pour la modération (visible admin)
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  decision text NOT NULL,
  reason text,
  category_check text,
  content_safety text,
  confidence numeric,
  raw_response jsonb,
  prompt_summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view moderation logs" ON public.moderation_logs;
CREATE POLICY "Admins can view moderation logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Producers can view own moderation logs" ON public.moderation_logs;
CREATE POLICY "Producers can view own moderation logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.profiles pr ON pr.id = p.producer_id
    WHERE p.id = moderation_logs.product_id AND pr.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service can insert moderation logs" ON public.moderation_logs;
CREATE POLICY "Service can insert moderation logs"
  ON public.moderation_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_moderation_logs_product ON public.moderation_logs(product_id, created_at DESC);

-- 5) Fonction RPC pour resoumettre un produit refusé (réinitialise la modération)
CREATE OR REPLACE FUNCTION public.resubmit_product_moderation(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT pr.user_id INTO v_owner
  FROM public.products p
  JOIN public.profiles pr ON pr.id = p.producer_id
  WHERE p.id = p_product_id;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.products
  SET moderation_status = 'pending',
      moderation_scheduled_at = now() + interval '20 minutes',
      moderation_reason = NULL,
      moderated_at = NULL,
      updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'next_check_at', now() + interval '20 minutes');
END;
$$;
