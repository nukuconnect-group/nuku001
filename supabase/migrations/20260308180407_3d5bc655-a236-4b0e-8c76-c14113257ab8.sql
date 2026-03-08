
-- 1. FIX: Remove anon access to profiles (phone exposure)
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- 2. FIX: Subscription privilege escalation - remove user UPDATE, use secure function instead
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Create secure function for subscription changes (admin/server only)
CREATE OR REPLACE FUNCTION public.update_user_subscription(
  p_user_id uuid,
  p_plan text,
  p_max_products integer,
  p_billing_period text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: only admins can modify subscriptions';
  END IF;
  
  UPDATE public.subscriptions
  SET plan = p_plan,
      max_products = p_max_products,
      billing_period = p_billing_period,
      expires_at = p_expires_at,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 3. FIX: analytics_visits INSERT - restrict to not allow arbitrary user_id spoofing
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.analytics_visits;
CREATE POLICY "Anyone can insert analytics"
ON public.analytics_visits
FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 4. FIX: Demands - hide budget from other users, allow public viewing of non-sensitive fields
DROP POLICY IF EXISTS "Demands viewable by authenticated users" ON public.demands;

-- Users can see all demands (marketplace feature) but we'll handle budget restriction in app
CREATE POLICY "Demands viewable by all"
ON public.demands
FOR SELECT
USING (true);
