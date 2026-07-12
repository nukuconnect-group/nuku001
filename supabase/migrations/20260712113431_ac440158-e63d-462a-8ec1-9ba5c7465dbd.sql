
-- 1) conversations: rescope UPDATE policy to authenticated only, trigger enforces immutability of buyer/seller/product
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = ANY (ARRAY[conversations.buyer_id, conversations.seller_id])
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = ANY (ARRAY[conversations.buyer_id, conversations.seller_id])
      AND p.user_id = auth.uid()
  )
);

-- Also rescope SELECT to authenticated for defense in depth
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = ANY (ARRAY[conversations.buyer_id, conversations.seller_id])
      AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Buyers can create conversations" ON public.conversations;
CREATE POLICY "Buyers can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = conversations.buyer_id AND p.user_id = auth.uid()
  )
);

-- 2) nuku_ai_questions: rescope policies to authenticated role
DROP POLICY IF EXISTS "Admins can view all questions" ON public.nuku_ai_questions;
CREATE POLICY "Admins can view all questions"
ON public.nuku_ai_questions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can log a question" ON public.nuku_ai_questions;
CREATE POLICY "Authenticated users can log a question"
ON public.nuku_ai_questions
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3) support_messages: prevent posting into another user's ticket
DROP POLICY IF EXISTS "Users can insert support messages" ON public.support_messages;
CREATE POLICY "Users can insert support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- New ticket: no existing message with this ticket_id
    NOT EXISTS (
      SELECT 1 FROM public.support_messages sm
      WHERE sm.ticket_id = support_messages.ticket_id
    )
    OR
    -- Existing ticket owned by this user
    EXISTS (
      SELECT 1 FROM public.support_messages sm
      WHERE sm.ticket_id = support_messages.ticket_id
        AND sm.user_id = auth.uid()
    )
  )
);
