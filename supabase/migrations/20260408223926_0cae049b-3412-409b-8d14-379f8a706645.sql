
-- Remove the insecure UPDATE policy
DROP POLICY IF EXISTS "Referred users can activate their referral" ON public.referrals;

-- Create a secure RPC for claiming referrals
CREATE OR REPLACE FUNCTION public.claim_referral(p_referral_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id uuid;
  v_referrer_id uuid;
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the unclaimed referral by code
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE referral_code = p_referral_code
    AND referred_user_id IS NULL
    AND status = 'pending'
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    RAISE EXCEPTION 'Referral code not found or already claimed';
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = v_caller THEN
    RAISE EXCEPTION 'Cannot claim your own referral code';
  END IF;

  -- Prevent user from claiming multiple referrals
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = v_caller) THEN
    RAISE EXCEPTION 'You have already used a referral code';
  END IF;

  -- Claim it
  UPDATE public.referrals
  SET referred_user_id = v_caller,
      status = 'active',
      activated_at = now(),
      updated_at = now()
  WHERE id = v_referral_id;

  RETURN v_referral_id;
END;
$$;
