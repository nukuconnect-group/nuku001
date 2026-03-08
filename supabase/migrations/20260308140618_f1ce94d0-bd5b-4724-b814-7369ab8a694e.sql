
-- Fix orders UPDATE: restrict sellers to only update status
DROP POLICY IF EXISTS "Sellers can update order status" ON public.orders;
CREATE POLICY "Sellers can update order status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = orders.seller_id AND profiles.user_id = auth.uid()))
  WITH CHECK (
    buyer_id = (SELECT buyer_id FROM orders o2 WHERE o2.id = orders.id) AND
    seller_id = (SELECT seller_id FROM orders o2 WHERE o2.id = orders.id) AND
    product_id = (SELECT product_id FROM orders o2 WHERE o2.id = orders.id) AND
    quantity = (SELECT quantity FROM orders o2 WHERE o2.id = orders.id) AND
    total_price = (SELECT total_price FROM orders o2 WHERE o2.id = orders.id)
  );

-- Fix messages UPDATE: only allow toggling is_read
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c JOIN profiles p ON (p.id = c.buyer_id OR p.id = c.seller_id)
    WHERE c.id = messages.conversation_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (
    content = (SELECT content FROM messages m2 WHERE m2.id = messages.id) AND
    sender_id = (SELECT sender_id FROM messages m2 WHERE m2.id = messages.id) AND
    conversation_id = (SELECT conversation_id FROM messages m2 WHERE m2.id = messages.id)
  );

-- Fix conversations UPDATE: prevent changing participants
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = ANY(ARRAY[conversations.buyer_id, conversations.seller_id]) AND profiles.user_id = auth.uid()
  ))
  WITH CHECK (
    buyer_id = (SELECT buyer_id FROM conversations c2 WHERE c2.id = conversations.id) AND
    seller_id = (SELECT seller_id FROM conversations c2 WHERE c2.id = conversations.id) AND
    product_id IS NOT DISTINCT FROM (SELECT product_id FROM conversations c2 WHERE c2.id = conversations.id)
  );

-- Fix demands: restrict anonymous access
DROP POLICY IF EXISTS "Demands are viewable by everyone" ON public.demands;
CREATE POLICY "Demands viewable by authenticated users" ON public.demands FOR SELECT TO authenticated USING (true);

-- Fix profiles_public view: it's a view not a table, RLS doesn't apply directly - drop and use profiles policies instead
DROP VIEW IF EXISTS public.profiles_public;
