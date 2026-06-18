
-- Fix 1: Restrict review visibility to authenticated users to avoid leaking reviewer UUIDs
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.reviews;
CREATE POLICY "Authenticated users can view reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Realtime broadcast send policy must restrict call:{uid} channel to the target user being addressable,
-- but more importantly we must scope inserts so a user can only send to their own call channel or known participants.
-- The call:{targetUserId} channel is used for ringing — we keep that but require the topic uid to be a real user.
-- Tighten by requiring either targeting another user (call:<uuid>) AND auth.uid() IS NOT NULL (already enforced),
-- but additionally disallow targeting yourself spam pattern is fine; the real fix per scanner: scope sends like receives.
DROP POLICY IF EXISTS "authenticated_scoped_send_broadcasts" ON realtime.messages;
CREATE POLICY "authenticated_scoped_send_broadcasts"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Sending to one's own call channel (e.g. answer/ack)
      realtime.topic() = ('call:' || auth.uid()::text)
      -- Outgoing call invite to another existing user; target must be a valid auth user
      OR (
        realtime.topic() LIKE 'call:%'
        AND EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id::text = substring(realtime.topic() from 6)
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
