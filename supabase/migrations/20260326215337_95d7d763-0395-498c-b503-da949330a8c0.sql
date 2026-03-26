
-- Fix the overly permissive insert policy on deliveries
DROP POLICY "System can insert deliveries" ON public.deliveries;

CREATE POLICY "Authenticated can insert deliveries for own orders" ON public.deliveries
  FOR INSERT TO authenticated WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders WHERE buyer_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
      OR seller_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM public.driver_profiles WHERE user_id = auth.uid())
  );
