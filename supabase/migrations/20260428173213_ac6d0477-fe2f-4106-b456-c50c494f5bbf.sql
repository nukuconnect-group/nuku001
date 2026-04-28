
CREATE OR REPLACE FUNCTION public.create_referral_earning_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  buyer_user_id uuid;
  ref_record RECORD;
  commission numeric;
BEGIN
  SELECT user_id INTO buyer_user_id FROM public.profiles WHERE id = NEW.buyer_id;
  IF buyer_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT r.id, r.referrer_id INTO ref_record
  FROM public.referrals r
  WHERE r.referred_user_id = buyer_user_id AND r.status = 'active'
  LIMIT 1;

  IF ref_record.id IS NULL THEN RETURN NEW; END IF;

  -- 2% commission on every purchase (was 3%)
  commission := ROUND(NEW.total_price * 0.02, 0);
  IF commission <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.referral_earnings (referrer_id, referral_id, amount, source_type, source_amount, commission_rate, description)
  VALUES (ref_record.referrer_id, ref_record.id, commission, 'purchase', NEW.total_price, 0.02, 'Commission 2% sur achat #' || LEFT(NEW.id::text, 8));

  RETURN NEW;
END;
$$;
