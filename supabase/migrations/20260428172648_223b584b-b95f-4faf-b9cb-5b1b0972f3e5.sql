
-- 1) Trigger commissions sur ACHATS (3%) — la fonction existe déjà
DROP TRIGGER IF EXISTS trg_referral_earning_on_order ON public.orders;
CREATE TRIGGER trg_referral_earning_on_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_earning_on_order();

-- 2) Nouvelle fonction commissions sur ABONNEMENTS (10%)
CREATE OR REPLACE FUNCTION public.create_referral_earning_on_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_record RECORD;
  plan_price numeric := 0;
  commission numeric;
BEGIN
  -- Only when transitioning to a paid plan or paid plan being (re)activated
  IF NEW.plan IS NULL OR NEW.plan = 'free' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Only fire when the plan changes (upgrade / renewal to paid)
  IF TG_OP = 'UPDATE' AND OLD.plan = NEW.plan AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Find active referral for this user
  SELECT r.id, r.referrer_id INTO ref_record
  FROM public.referrals r
  WHERE r.referred_user_id = NEW.user_id AND r.status = 'active'
  LIMIT 1;

  IF ref_record.id IS NULL THEN RETURN NEW; END IF;

  -- Estimate plan price (FCFA, monthly equivalent). Adjust here if pricing changes.
  plan_price := CASE NEW.plan
    WHEN 'pro' THEN 5000
    WHEN 'premium' THEN 15000
    WHEN 'business' THEN 30000
    ELSE 0
  END;

  IF NEW.billing_period = 'yearly' THEN
    plan_price := plan_price * 12;
  END IF;

  IF plan_price <= 0 THEN RETURN NEW; END IF;

  commission := ROUND(plan_price * 0.10, 0);

  -- Avoid duplicate earning for the same subscription event in the same hour
  IF EXISTS (
    SELECT 1 FROM public.referral_earnings
    WHERE referrer_id = ref_record.referrer_id
      AND referral_id = ref_record.id
      AND source_type = 'subscription'
      AND created_at > now() - interval '1 hour'
      AND source_amount = plan_price
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.referral_earnings (
    referrer_id, referral_id, amount, source_type,
    source_amount, commission_rate, description
  )
  VALUES (
    ref_record.referrer_id, ref_record.id, commission, 'subscription',
    plan_price, 0.10,
    'Commission 10% sur abonnement ' || NEW.plan
  );

  RETURN NEW;
END;
$$;

-- 3) Trigger sur abonnements
DROP TRIGGER IF EXISTS trg_referral_earning_on_subscription ON public.subscriptions;
CREATE TRIGGER trg_referral_earning_on_subscription
AFTER INSERT OR UPDATE OF plan, status ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_earning_on_subscription();
