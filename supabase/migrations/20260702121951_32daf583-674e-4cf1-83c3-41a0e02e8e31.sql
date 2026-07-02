
CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  conversation_id uuid,
  message text NOT NULL,
  stack text,
  page text,
  component text,
  severity text NOT NULL DEFAULT 'error',
  meta jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.app_error_logs TO authenticated;
GRANT INSERT ON public.app_error_logs TO anon;
GRANT ALL ON public.app_error_logs TO service_role;

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log errors"
  ON public.app_error_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins read all errors"
  ON public.app_error_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at
  ON public.app_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_user_id
  ON public.app_error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_conversation_id
  ON public.app_error_logs (conversation_id);
