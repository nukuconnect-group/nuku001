
-- Fix: Remove the overly permissive INSERT policy that allows any driver to insert deliveries for any order
DROP POLICY IF EXISTS "Authenticated can insert deliveries for own orders" ON public.deliveries;

-- New policy: only buyer or seller of the order can create delivery records
CREATE POLICY "Buyers and sellers can insert deliveries for own orders"
ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (
  order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.profiles p ON p.id = o.buyer_id OR p.id = o.seller_id
    WHERE p.user_id = auth.uid()
  )
);
