-- Cookie consent tracking
CREATE TABLE public.cookie_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  consent TEXT NOT NULL CHECK (consent IN ('accepted', 'ignored', 'rejected')),
  user_agent TEXT,
  ip_country TEXT,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_cookie_consents_created_at ON public.cookie_consents(created_at DESC);
CREATE INDEX idx_cookie_consents_user_id ON public.cookie_consents(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) can record their consent
CREATE POLICY "Anyone can record consent"
  ON public.cookie_consents FOR INSERT
  TO public
  WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

-- Users can view their own consents
CREATE POLICY "Users view own consents"
  ON public.cookie_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins view all consents
CREATE POLICY "Admins view all consents"
  ON public.cookie_consents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));