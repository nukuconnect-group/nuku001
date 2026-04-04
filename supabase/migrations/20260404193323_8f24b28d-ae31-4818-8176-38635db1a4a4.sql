-- Remove direct user INSERT policy on withdrawals
DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;

-- Add CHECK constraint for positive amounts
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_amount_positive CHECK (amount > 0);
