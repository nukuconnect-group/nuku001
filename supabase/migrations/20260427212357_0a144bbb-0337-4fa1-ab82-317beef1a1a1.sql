CREATE TABLE IF NOT EXISTS public.page_performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text NOT NULL,
  load_time_ms integer NOT NULL,
  ttfb_ms integer,
  dom_ready_ms integer,
  fcp_ms integer,
  connection_type text,
  is_slow boolean NOT NULL DEFAULT false,
  had_error boolean NOT NULL DEFAULT false,
  error_message text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_route ON public.page_performance_logs(route);
CREATE INDEX IF NOT EXISTS idx_perf_created ON public.page_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_slow ON public.page_performance_logs(is_slow) WHERE is_slow = true;

ALTER TABLE public.page_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log performance"
  ON public.page_performance_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read performance logs"
  ON public.page_performance_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_route_performance_stats(_days integer DEFAULT 7)
RETURNS TABLE (
  route text,
  total_loads bigint,
  avg_load_ms numeric,
  p95_load_ms numeric,
  slow_count bigint,
  error_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    route,
    COUNT(*)::bigint AS total_loads,
    ROUND(AVG(load_time_ms)::numeric, 0) AS avg_load_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load_time_ms)::numeric, 0) AS p95_load_ms,
    COUNT(*) FILTER (WHERE is_slow)::bigint AS slow_count,
    COUNT(*) FILTER (WHERE had_error)::bigint AS error_count
  FROM public.page_performance_logs
  WHERE created_at >= now() - (_days || ' days')::interval
  GROUP BY route
  ORDER BY avg_load_ms DESC
  LIMIT 100;
$$;