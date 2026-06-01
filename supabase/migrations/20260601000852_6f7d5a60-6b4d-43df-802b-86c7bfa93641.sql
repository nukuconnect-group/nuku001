
-- 1) Tighten notifications INSERT: any signed-in user could insert notifications for any user
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Fix paid formation modules paywall: require a completed payment, not just enrollment
DROP POLICY IF EXISTS "Enrolled users can view paid formation modules" ON public.formation_modules;
CREATE POLICY "Paid users can view paid formation modules"
  ON public.formation_modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_modules.formation_id AND f.is_paid = true
    )
    AND EXISTS (
      SELECT 1 FROM public.formation_payments fp
      WHERE fp.formation_id = formation_modules.formation_id
        AND fp.user_id = auth.uid()
        AND fp.status = 'completed'
    )
  );

-- 3) Remove sensitive tables from Realtime publication to prevent cross-user data leakage
-- (no realtime.messages RLS available — safest is to drop the publication membership)
ALTER PUBLICATION supabase_realtime DROP TABLE public.email_send_log;
ALTER PUBLICATION supabase_realtime DROP TABLE public.token_purchases;
ALTER PUBLICATION supabase_realtime DROP TABLE public.token_transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.api_key_usage;
