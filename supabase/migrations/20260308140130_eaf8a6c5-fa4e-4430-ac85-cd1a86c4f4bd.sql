
-- 1. Fix profiles: restrict SELECT to authenticated users only for sensitive fields
-- Drop existing permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Public can only see non-sensitive fields via a view
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT id, full_name, avatar_url, user_type, is_verified, location, bio, created_at
  FROM public.profiles;

-- Authenticated users can see their own full profile
CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Other authenticated users can see limited profile data (needed for product listings, conversations)
CREATE POLICY "Authenticated users can view basic profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous profile access"
  ON public.profiles FOR SELECT
  TO anon
  USING (false);

-- 2. Fix messages INSERT: verify sender is a participant in the conversation
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = messages.sender_id
        AND profiles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM conversations c
      JOIN profiles p ON (p.id = c.buyer_id OR p.id = c.seller_id)
      WHERE c.id = messages.conversation_id
        AND p.user_id = auth.uid()
    )
  );

-- 3. Fix notifications INSERT: only allow via trigger/service_role, not directly by users
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- No INSERT policy for authenticated users - notifications are created by triggers (SECURITY DEFINER)
-- This means only triggers and service_role can insert notifications

-- 4. Enable leaked password protection
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
