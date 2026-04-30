-- Add reminder tracking column on messages (idempotency for email reminders)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_unread_pending_reminder
  ON public.messages (created_at)
  WHERE is_read = false AND reminder_sent_at IS NULL;

-- Enable realtime for boost stats live updates (safe if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
