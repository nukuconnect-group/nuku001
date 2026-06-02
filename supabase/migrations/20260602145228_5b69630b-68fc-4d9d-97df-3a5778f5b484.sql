CREATE TABLE public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  query text NOT NULL,
  mode text NOT NULL DEFAULT 'text' CHECK (mode IN ('text','voice','image','qr')),
  category text,
  result_count integer NOT NULL DEFAULT 0,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_queries_created_at ON public.search_queries (created_at DESC);
CREATE INDEX idx_search_queries_query_lower ON public.search_queries (lower(query));
CREATE INDEX idx_search_queries_mode ON public.search_queries (mode);
CREATE INDEX idx_search_queries_category ON public.search_queries (category);

GRANT INSERT ON public.search_queries TO anon, authenticated;
GRANT SELECT ON public.search_queries TO authenticated;
GRANT ALL ON public.search_queries TO service_role;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a search"
ON public.search_queries FOR INSERT
TO anon, authenticated
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

CREATE POLICY "Admins view all searches"
ON public.search_queries FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view their own searches"
ON public.search_queries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);