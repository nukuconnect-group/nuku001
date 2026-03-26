
-- Delivery chat messages
CREATE TABLE public.delivery_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'buyer',
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_messages ENABLE ROW LEVEL SECURITY;

-- Users involved in the delivery can view messages
CREATE POLICY "Delivery participants can view messages" ON public.delivery_messages
FOR SELECT TO authenticated
USING (
  delivery_id IN (
    SELECT d.id FROM public.deliveries d
    WHERE d.driver_id IN (SELECT dp.id FROM public.driver_profiles dp WHERE dp.user_id = auth.uid())
    UNION
    SELECT d.id FROM public.deliveries d
    JOIN public.orders o ON o.id = d.order_id
    JOIN public.profiles p ON p.id = o.buyer_id
    WHERE p.user_id = auth.uid()
  )
);

-- Participants can insert messages
CREATE POLICY "Delivery participants can send messages" ON public.delivery_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  delivery_id IN (
    SELECT d.id FROM public.deliveries d
    WHERE d.driver_id IN (SELECT dp.id FROM public.driver_profiles dp WHERE dp.user_id = auth.uid())
    UNION
    SELECT d.id FROM public.deliveries d
    JOIN public.orders o ON o.id = d.order_id
    JOIN public.profiles p ON p.id = o.buyer_id
    WHERE p.user_id = auth.uid()
  )
);

-- Participants can mark messages as read
CREATE POLICY "Delivery participants can update messages" ON public.delivery_messages
FOR UPDATE TO authenticated
USING (
  delivery_id IN (
    SELECT d.id FROM public.deliveries d
    WHERE d.driver_id IN (SELECT dp.id FROM public.driver_profiles dp WHERE dp.user_id = auth.uid())
    UNION
    SELECT d.id FROM public.deliveries d
    JOIN public.orders o ON o.id = d.order_id
    JOIN public.profiles p ON p.id = o.buyer_id
    WHERE p.user_id = auth.uid()
  )
);

-- Enable realtime for delivery messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_messages;
