
-- Presence table for online/offline status
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Everyone can read presence
CREATE POLICY "Anyone can view presence" ON public.user_presence
  FOR SELECT TO authenticated USING (true);

-- Users can upsert their own presence
CREATE POLICY "Users can update own presence" ON public.user_presence
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Add reply_to_id column to messages for quoted replies
ALTER TABLE public.messages ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) DEFAULT NULL;
