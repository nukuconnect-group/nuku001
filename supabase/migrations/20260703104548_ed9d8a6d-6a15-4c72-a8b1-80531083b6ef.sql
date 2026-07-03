
-- 1) Tighten app_error_logs INSERT policy (remove WITH CHECK true)
DROP POLICY IF EXISTS "anyone can log errors" ON public.app_error_logs;
CREATE POLICY "log errors with matching user"
ON public.app_error_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 2) Remove buyer direct SELECT on delivery_otps (use RPC instead)
DROP POLICY IF EXISTS "Buyers can view own delivery OTP" ON public.delivery_otps;
