
CREATE TABLE IF NOT EXISTS public.watermark_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT,
  error_kind TEXT NOT NULL,
  error_message TEXT,
  upstream_status INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watermark_error_logs_created_at
  ON public.watermark_error_logs (created_at DESC);

ALTER TABLE public.watermark_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view watermark error logs"
ON public.watermark_error_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
