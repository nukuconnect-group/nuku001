DROP POLICY IF EXISTS "Sellers can update order status" ON public.orders;
CREATE POLICY "Sellers can update order status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = orders.seller_id AND profiles.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = orders.seller_id AND profiles.user_id = auth.uid()));
-- Immutability of buyer_id, seller_id, product_id, quantity, total_price is enforced by the
-- BEFORE UPDATE trigger enforce_order_immutable_fields_trigger (compares OLD vs NEW).