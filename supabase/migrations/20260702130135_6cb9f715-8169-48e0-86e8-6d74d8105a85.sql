-- Fix infinite recursion in messages UPDATE policy.
-- The previous policy compared NEW columns to a subquery on messages,
-- which retriggered RLS on messages → infinite recursion (42P17).
-- Replace with a non-recursive policy + a trigger that prevents tampering
-- with sender_id/conversation_id, and allows sender-only content edits
-- (used by soft-delete "Message supprimé").

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;

CREATE OR REPLACE FUNCTION public.messages_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_sender boolean;
BEGIN
  -- Immutable columns
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable columns cannot be modified';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = OLD.sender_id AND p.user_id = auth.uid()
  ) INTO is_sender;

  -- Only the sender may change content (soft-delete).
  IF NEW.content IS DISTINCT FROM OLD.content AND NOT is_sender THEN
    RAISE EXCEPTION 'Only the sender can modify message content';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard_update_trg ON public.messages;
CREATE TRIGGER messages_guard_update_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_guard_update();

CREATE POLICY "Participants can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON (p.id = c.buyer_id OR p.id = c.seller_id)
    WHERE c.id = messages.conversation_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON (p.id = c.buyer_id OR p.id = c.seller_id)
    WHERE c.id = messages.conversation_id AND p.user_id = auth.uid()
  )
);