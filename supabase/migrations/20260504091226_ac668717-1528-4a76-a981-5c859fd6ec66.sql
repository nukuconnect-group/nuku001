
-- Allow sellers to create conversations (needed when suppliers respond to buyer demands)
CREATE POLICY "Sellers can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = conversations.seller_id
    AND profiles.user_id = auth.uid()
  )
);

-- Allow authenticated users to insert notifications for other users (demand responses, etc.)
CREATE POLICY "Authenticated users can notify others"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Drop the restrictive self-only insert policy
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- Update get_admin_analytics to include unique visitors per country/city
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      SELECT coalesce(json_agg(json_build_object('device', device_type, 'count', cnt)), '[]'::json)
      FROM (SELECT device_type, count(*) as cnt FROM analytics_visits GROUP BY device_type ORDER BY cnt DESC) d
    ),
    'browser_stats', (
      SELECT coalesce(json_agg(json_build_object('browser', browser, 'count', cnt)), '[]'::json)
      FROM (SELECT browser, count(*) as cnt FROM analytics_visits WHERE browser IS NOT NULL GROUP BY browser ORDER BY cnt DESC LIMIT 5) b
    ),
    'os_stats', (
      SELECT coalesce(json_agg(json_build_object('os', os, 'count', cnt)), '[]'::json)
      FROM (SELECT os, count(*) as cnt FROM analytics_visits WHERE os IS NOT NULL GROUP BY os ORDER BY cnt DESC LIMIT 5) o
    ),
    'country_stats', (
      SELECT coalesce(json_agg(json_build_object('country', country, 'visits', cnt, 'unique_visitors', uv)), '[]'::json)
      FROM (
        SELECT country, count(*) as cnt, count(DISTINCT session_id) as uv
        FROM analytics_visits WHERE country IS NOT NULL
        GROUP BY country ORDER BY cnt DESC LIMIT 15
      ) c
    ),
    'city_stats', (
      SELECT coalesce(json_agg(json_build_object('city', city, 'country', country, 'visits', cnt, 'unique_visitors', uv)), '[]'::json)
      FROM (
        SELECT city, country, count(*) as cnt, count(DISTINCT session_id) as uv
        FROM analytics_visits WHERE city IS NOT NULL
        GROUP BY city, country ORDER BY cnt DESC LIMIT 15
      ) ci
    ),
    'page_stats', (
      SELECT coalesce(json_agg(json_build_object('page', page_path, 'count', cnt)), '[]'::json)
      FROM (SELECT page_path, count(*) as cnt FROM analytics_visits GROUP BY page_path ORDER BY cnt DESC LIMIT 10) p
    ),
    'pwa_installs', (SELECT count(DISTINCT session_id) FROM analytics_visits WHERE is_pwa = true),
    'daily_visits', (
      SELECT coalesce(json_agg(json_build_object('date', day, 'visits', cnt, 'unique_visitors', uv)), '[]'::json)
      FROM (
        SELECT DATE(created_at) as day, count(*) as cnt, count(DISTINCT session_id) as uv
        FROM analytics_visits WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY day
      ) dv
    )
  ) INTO result;

  RETURN result;
END;
$$;
