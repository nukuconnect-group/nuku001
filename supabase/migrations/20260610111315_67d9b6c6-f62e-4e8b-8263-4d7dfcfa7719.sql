
-- 1) Lock down email-assets bucket: keep public read (used in emails) but make explicit and document
-- The bucket must remain public so email clients can fetch images. Add explicit SELECT policy
-- so the scanner sees an intentional rule rather than implicit public-bucket access.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Public can read email assets'
  ) THEN
    CREATE POLICY "Public can read email assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'email-assets');
  END IF;
END $$;

-- 2) Helper: check if current authenticated user is a participant of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON p.id = c.buyer_id OR p.id = c.seller_id
    WHERE c.id = _conversation_id
      AND p.user_id = auth.uid()
  );
$$;

-- 3) Helper: check if current user is involved in a delivery (driver, buyer, or seller)
CREATE OR REPLACE FUNCTION public.is_delivery_participant(_delivery_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deliveries d
    LEFT JOIN public.orders o ON o.id = d.order_id
    LEFT JOIN public.profiles pb ON pb.id = o.buyer_id
    LEFT JOIN public.profiles ps ON ps.id = o.seller_id
    WHERE d.id = _delivery_id
      AND (
        d.driver_id = auth.uid()
        OR pb.user_id = auth.uid()
        OR ps.user_id = auth.uid()
      )
  );
$$;

-- 4) Tighten realtime.messages policies: replace permissive broadcast rules with topic-scoped checks
DROP POLICY IF EXISTS "authenticated_can_receive_broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_can_send_broadcasts" ON realtime.messages;

-- Receive: only on topics the user belongs to
CREATE POLICY "authenticated_scoped_receive_broadcasts"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Personal call signaling channel: call:{userId}
      realtime.topic() = ('call:' || auth.uid()::text)
      -- Typing indicator per conversation: typing-{conversationId}
      OR (
        realtime.topic() LIKE 'typing-%'
        AND public.is_conversation_participant(
          NULLIF(substring(realtime.topic() from 8), '')::uuid
        )
      )
      -- In-delivery call signaling: call-{deliveryId}
      OR (
        realtime.topic() LIKE 'call-%'
        AND public.is_delivery_participant(
          NULLIF(substring(realtime.topic() from 6), '')::uuid
        )
      )
    )
  );

-- Send: only on topics the user belongs to (or sending a call invite to a target user)
CREATE POLICY "authenticated_scoped_send_broadcasts"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Outgoing call invite: call:{targetUserId} – any authenticated user may dial another user
      realtime.topic() LIKE 'call:%'
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
