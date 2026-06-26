
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

CREATE OR REPLACE FUNCTION public.can_signal_call(target_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_uid IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      target_uid = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.conversations c
        JOIN public.profiles pme   ON pme.user_id   = auth.uid()
        JOIN public.profiles pthem ON pthem.user_id = target_uid
        WHERE (c.buyer_id  = pme.id AND c.seller_id = pthem.id)
           OR (c.seller_id = pme.id AND c.buyer_id  = pthem.id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.deliveries d
        JOIN public.orders o ON o.id = d.order_id
        WHERE (
          (o.buyer_id = auth.uid()  AND d.driver_id = target_uid) OR
          (d.driver_id = auth.uid() AND o.buyer_id  = target_uid) OR
          (o.seller_id = auth.uid() AND d.driver_id = target_uid) OR
          (d.driver_id = auth.uid() AND o.seller_id = target_uid)
        )
      )
    )
$$;

GRANT EXECUTE ON FUNCTION public.can_signal_call(uuid) TO authenticated;

DROP POLICY IF EXISTS "authenticated_scoped_send_broadcasts" ON realtime.messages;
CREATE POLICY "authenticated_scoped_send_broadcasts"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (
        realtime.topic() LIKE 'call:%'
        AND public.can_signal_call(
          NULLIF(substring(realtime.topic() from 6), '')::uuid
        )
      )
      OR (
        realtime.topic() LIKE 'typing-%'
        AND public.is_conversation_participant(
          NULLIF(substring(realtime.topic() from 8), '')::uuid
        )
      )
      OR (
        realtime.topic() LIKE 'call-%'
        AND public.is_delivery_participant(
          NULLIF(substring(realtime.topic() from 6), '')::uuid
        )
      )
    )
  );
