-- Fix referral system: allow each referral_code to be claimed by multiple users
-- by inserting a NEW row per claim instead of updating the original pending row.

CREATE OR REPLACE FUNCTION public.claim_referral(p_referral_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_caller uuid;
  v_new_id uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the referrer that owns this code (any row with this code reveals the referrer)
  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referral_code = p_referral_code
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Referral code not found';
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = v_caller THEN
    RAISE EXCEPTION 'Cannot claim your own referral code';
  END IF;

  -- Prevent user from claiming multiple referrals
  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referred_user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'You have already used a referral code';
  END IF;

  -- Insert a new claimed row (one row per referred user)
  INSERT INTO public.referrals (referrer_id, referral_code, referred_user_id, status, activated_at)
  VALUES (v_referrer_id, p_referral_code, v_caller, 'active', now())
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;