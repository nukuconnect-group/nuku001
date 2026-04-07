CREATE POLICY "Referred users can activate their referral"
ON public.referrals
FOR UPDATE
TO authenticated
USING (referred_user_id IS NULL)
WITH CHECK (referred_user_id = auth.uid());