
-- Analytics visits table
CREATE TABLE public.analytics_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  page_path text NOT NULL,
  referrer text,
  user_agent text,
  device_type text DEFAULT 'desktop',
  browser text,
  os text,
  country text,
  city text,
  region text,
  is_pwa boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_visits ENABLE ROW LEVEL SECURITY;

-- Only admins can read analytics
CREATE POLICY "Admins can view analytics"
ON public.analytics_visits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert (tracking)
CREATE POLICY "Anyone can insert analytics"
ON public.analytics_visits FOR INSERT
WITH CHECK (true);

-- Admin analytics function
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_visits', (SELECT count(*) FROM analytics_visits),
    'unique_visitors', (SELECT count(DISTINCT session_id) FROM analytics_visits),
    'today_visits', (SELECT count(*) FROM analytics_visits WHERE created_at >= CURRENT_DATE),
    'this_week_visits', (SELECT count(*) FROM analytics_visits WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'device_stats', (
      SELECT json_agg(json_build_object('device', device_type, 'count', cnt))
      FROM (SELECT device_type, count(*) as cnt FROM analytics_visits GROUP BY device_type ORDER BY cnt DESC) d
    ),
    'browser_stats', (
      SELECT json_agg(json_build_object('browser', browser, 'count', cnt))
      FROM (SELECT browser, count(*) as cnt FROM analytics_visits WHERE browser IS NOT NULL GROUP BY browser ORDER BY cnt DESC LIMIT 5) b
    ),
    'os_stats', (
      SELECT json_agg(json_build_object('os', os, 'count', cnt))
      FROM (SELECT os, count(*) as cnt FROM analytics_visits WHERE os IS NOT NULL GROUP BY os ORDER BY cnt DESC LIMIT 5) o
    ),
    'country_stats', (
      SELECT json_agg(json_build_object('country', country, 'count', cnt))
      FROM (SELECT country, count(*) as cnt FROM analytics_visits WHERE country IS NOT NULL GROUP BY country ORDER BY cnt DESC LIMIT 10) c
    ),
    'city_stats', (
      SELECT json_agg(json_build_object('city', city, 'count', cnt))
      FROM (SELECT city, count(*) as cnt FROM analytics_visits WHERE city IS NOT NULL GROUP BY city ORDER BY cnt DESC LIMIT 10) ci
    ),
    'page_stats', (
      SELECT json_agg(json_build_object('page', page_path, 'count', cnt))
      FROM (SELECT page_path, count(*) as cnt FROM analytics_visits GROUP BY page_path ORDER BY cnt DESC LIMIT 10) p
    ),
    'pwa_installs', (SELECT count(DISTINCT session_id) FROM analytics_visits WHERE is_pwa = true),
    'daily_visits', (
      SELECT json_agg(json_build_object('date', day, 'visits', cnt))
      FROM (SELECT DATE(created_at) as day, count(*) as cnt FROM analytics_visits WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY day) dv
    )
  ) INTO result;

  RETURN result;
END;
$$;
