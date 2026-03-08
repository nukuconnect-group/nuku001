
-- Support messages table for user-to-admin contact chat
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'admin')),
  user_name TEXT,
  user_email TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own support messages
CREATE POLICY "Users can view own support messages"
  ON public.support_messages FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can insert their own support messages
CREATE POLICY "Users can insert support messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert replies
CREATE POLICY "Admins can insert support replies"
  ON public.support_messages FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update (mark as read)
CREATE POLICY "Admins can update support messages"
  ON public.support_messages FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can update own messages (mark as read)
CREATE POLICY "Users can update own support messages"
  ON public.support_messages FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Create index for ticket grouping
CREATE INDEX idx_support_messages_ticket ON public.support_messages (ticket_id, created_at);
CREATE INDEX idx_support_messages_user ON public.support_messages (user_id, created_at);
