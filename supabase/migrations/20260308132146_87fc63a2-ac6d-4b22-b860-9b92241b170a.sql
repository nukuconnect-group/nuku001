ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Allow participants to update conversations (for updated_at)
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id IN (conversations.buyer_id, conversations.seller_id)
  AND profiles.user_id = auth.uid()
));

-- Allow marking messages as read
CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN profiles p ON p.id IN (c.buyer_id, c.seller_id)
  WHERE c.id = messages.conversation_id AND p.user_id = auth.uid()
));