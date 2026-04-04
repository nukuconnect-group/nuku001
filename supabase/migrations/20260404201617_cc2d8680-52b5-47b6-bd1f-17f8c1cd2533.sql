
-- 1. Driver profiles: add approval status
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Available drivers can view pending deliveries" ON public.deliveries;
CREATE POLICY "Approved available drivers can view pending deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (
  status = 'pending' AND EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.user_id = auth.uid()
      AND dp.is_available = true
      AND dp.is_approved = true
  )
);

-- 2. Subscriptions: remove user INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- 3. Withdrawals: remove direct user INSERT
DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;

-- 4. Support messages: trigger to enforce email from auth
CREATE OR REPLACE FUNCTION public.set_support_message_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_email := (SELECT email FROM auth.users WHERE id = NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_support_email ON public.support_messages;
CREATE TRIGGER trg_set_support_email
BEFORE INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_support_message_email();

-- 5. Product boosts: remove user UPDATE policy
DROP POLICY IF EXISTS "Users can update their own boosts" ON public.product_boosts;
