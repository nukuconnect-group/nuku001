
-- Configurable reminder settings (no code change needed to tune)
CREATE TABLE IF NOT EXISTS public.message_reminder_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  reminder_delay_minutes INTEGER NOT NULL DEFAULT 5,
  reminder_window_minutes INTEGER NOT NULL DEFAULT 60,
  cron_interval_minutes INTEGER NOT NULL DEFAULT 2,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

INSERT INTO public.message_reminder_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.message_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read reminder settings" ON public.message_reminder_settings;
CREATE POLICY "Admins can read reminder settings"
ON public.message_reminder_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update reminder settings" ON public.message_reminder_settings;
CREATE POLICY "Admins can update reminder settings"
ON public.message_reminder_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Optional: store WhatsApp number per profile for reminders (opt-in)
ALTER TABLE public.profile_private
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_reminders_enabled BOOLEAN NOT NULL DEFAULT true;
