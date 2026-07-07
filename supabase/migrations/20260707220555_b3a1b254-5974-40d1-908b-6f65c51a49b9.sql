
-- delivery_messages: rescope to authenticated
DROP POLICY IF EXISTS "Delivery participants can view messages" ON public.delivery_messages;
DROP POLICY IF EXISTS "Delivery participants can send messages" ON public.delivery_messages;
DROP POLICY IF EXISTS "Delivery participants can update messages" ON public.delivery_messages;
DROP POLICY IF EXISTS "Delivery participants can delete own messages" ON public.delivery_messages;

CREATE POLICY "Delivery participants can view messages" ON public.delivery_messages
FOR SELECT TO authenticated USING (is_delivery_participant(delivery_id));

CREATE POLICY "Delivery participants can send messages" ON public.delivery_messages
FOR INSERT TO authenticated WITH CHECK ((sender_id = auth.uid()) AND is_delivery_participant(delivery_id));

CREATE POLICY "Delivery participants can update messages" ON public.delivery_messages
FOR UPDATE TO authenticated USING (is_delivery_participant(delivery_id));

CREATE POLICY "Delivery participants can delete own messages" ON public.delivery_messages
FOR DELETE TO authenticated USING ((sender_id = auth.uid()) AND is_delivery_participant(delivery_id));

-- driver_kyc_submissions: rescope to authenticated
DROP POLICY IF EXISTS "Users can view own kyc" ON public.driver_kyc_submissions;
DROP POLICY IF EXISTS "Users can submit kyc" ON public.driver_kyc_submissions;
DROP POLICY IF EXISTS "Users can update own kyc" ON public.driver_kyc_submissions;
DROP POLICY IF EXISTS "Admins can view all kyc" ON public.driver_kyc_submissions;
DROP POLICY IF EXISTS "Admins can update kyc" ON public.driver_kyc_submissions;

CREATE POLICY "Users can view own kyc" ON public.driver_kyc_submissions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can submit kyc" ON public.driver_kyc_submissions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kyc" ON public.driver_kyc_submissions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all kyc" ON public.driver_kyc_submissions
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update kyc" ON public.driver_kyc_submissions
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
