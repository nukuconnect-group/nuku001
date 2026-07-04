
-- 1) Fix is_delivery_participant: driver_id references driver_profiles.id, not auth.uid()
CREATE OR REPLACE FUNCTION public.is_delivery_participant(_delivery_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.deliveries d
    LEFT JOIN public.orders o ON o.id = d.order_id
    LEFT JOIN public.profiles pb ON pb.id = o.buyer_id
    LEFT JOIN public.profiles ps ON ps.id = o.seller_id
    LEFT JOIN public.driver_profiles dp ON dp.id = d.driver_id
    WHERE d.id = _delivery_id
      AND (
        dp.user_id = auth.uid()
        OR pb.user_id = auth.uid()
        OR ps.user_id = auth.uid()
      )
  );
$function$;

-- 2) Replace delivery_messages policies to include sellers
DROP POLICY IF EXISTS "Delivery participants can view messages" ON public.delivery_messages;
DROP POLICY IF EXISTS "Delivery participants can send messages" ON public.delivery_messages;
DROP POLICY IF EXISTS "Delivery participants can update messages" ON public.delivery_messages;
DROP POLICY IF EXISTS "Delivery participants can delete own messages" ON public.delivery_messages;

CREATE POLICY "Delivery participants can view messages"
ON public.delivery_messages FOR SELECT
USING (public.is_delivery_participant(delivery_id));

CREATE POLICY "Delivery participants can send messages"
ON public.delivery_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_delivery_participant(delivery_id)
);

CREATE POLICY "Delivery participants can update messages"
ON public.delivery_messages FOR UPDATE
USING (public.is_delivery_participant(delivery_id));

CREATE POLICY "Delivery participants can delete own messages"
ON public.delivery_messages FOR DELETE
USING (
  sender_id = auth.uid()
  AND public.is_delivery_participant(delivery_id)
);

-- 3) delivery_otps: document that access is server-only (service_role via edge functions)
COMMENT ON TABLE public.delivery_otps IS
  'OTP codes for delivery confirmation. Accessed exclusively via SECURITY DEFINER RPCs / edge functions using service_role. RLS is enabled with no client policies (default deny).';

-- 4) promo_codes: document server-only validation
COMMENT ON TABLE public.promo_codes IS
  'Promo codes. Validation performed server-side (admin management via has_role + edge functions). No client SELECT policy by design (default deny).';
