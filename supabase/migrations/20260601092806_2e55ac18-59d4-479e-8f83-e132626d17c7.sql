
-- 1. Set search_path on normalize_seo_slug to prevent search_path hijacking
CREATE OR REPLACE FUNCTION public.normalize_seo_slug(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  v text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  v := lower(trim(input));
  IF v = '__global__' THEN RETURN v; END IF;
  IF v !~ '^/' THEN v := '/' || v; END IF;
  v := regexp_replace(v, '[^a-z0-9\-/]', '', 'g');
  v := regexp_replace(v, '/+', '/', 'g');
  IF length(v) > 1 AND right(v, 1) = '/' THEN
    v := left(v, length(v) - 1);
  END IF;
  RETURN v;
END;
$function$;

-- 2. Tighten WITH CHECK (true) INSERT policies on telemetry tables.
-- Ensure logged user_id matches caller (or is null for anonymous telemetry).
DROP POLICY IF EXISTS "Anyone can log a question" ON public.nuku_ai_questions;
CREATE POLICY "Anyone can log a question"
ON public.nuku_ai_questions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Anyone can log performance" ON public.page_performance_logs;
CREATE POLICY "Anyone can log performance"
ON public.page_performance_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 3. Enable RLS on realtime.messages and restrict channel subscriptions
-- to authenticated users only (anonymous clients cannot snoop on any channel).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts"
  ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can send realtime broadcasts"
  ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
