-- Fix support_messages UPDATE policies: change from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can update support messages" ON public.support_messages;
CREATE POLICY "Admins can update support messages"
ON public.support_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can update own support messages" ON public.support_messages;
CREATE POLICY "Users can update own support messages"
ON public.support_messages FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Fix support_messages INSERT policy for admins: change from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can insert support replies" ON public.support_messages;
CREATE POLICY "Admins can insert support replies"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));