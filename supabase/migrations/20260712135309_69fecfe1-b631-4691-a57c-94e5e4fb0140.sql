-- Professional sponsored product rotation and ad metrics

CREATE TABLE IF NOT EXISTS public.product_boost_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id uuid NOT NULL REFERENCES public.product_boosts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'click', 'view', 'contact', 'favorite', 'order')),
  source text NOT NULL DEFAULT 'marketplace',
  session_key text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.product_boost_events TO service_role;
GRANT SELECT ON public.product_boost_events TO authenticated;

ALTER TABLE public.product_boost_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own boost events" ON public.product_boost_events;
CREATE POLICY "Sellers can view own boost events"
ON public.product_boost_events
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_product_boosts_active_rotation
ON public.product_boosts (is_active, expires_at, product_id, user_id, started_at);

CREATE INDEX IF NOT EXISTS idx_product_boost_events_boost_type_created
ON public.product_boost_events (boost_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_boost_events_product_type_created
ON public.product_boost_events (product_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_boost_events_seller_created
ON public.product_boost_events (seller_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.boost_plan_priority(p_plan_name text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p_plan_name, ''))
    WHEN 'featured' THEN 300
    WHEN 'vedette' THEN 300
    WHEN 'produit_vedette' THEN 300
    WHEN 'premium' THEN 220
    WHEN 'standard' THEN 140
    WHEN 'basic' THEN 100
    ELSE 100
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_boosted_product_ids()
RETURNS TABLE(product_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      b.id AS boost_id,
      b.product_id,
      b.user_id,
      b.plan_name,
      b.started_at,
      b.expires_at,
      COUNT(e.id) FILTER (WHERE e.event_type = 'impression') AS impressions,
      COUNT(e.id) FILTER (WHERE e.event_type IN ('click', 'view')) AS clicks
    FROM public.product_boosts b
    JOIN public.products p ON p.id = b.product_id AND p.moderation_status = 'approved'
    LEFT JOIN public.product_boost_events e
      ON e.boost_id = b.id
      AND e.created_at >= b.started_at
      AND e.created_at <= LEAST(b.expires_at, now())
    WHERE b.is_active = true
      AND b.expires_at > now()
    GROUP BY b.id, b.product_id, b.user_id, b.plan_name, b.started_at, b.expires_at
  ), ranked AS (
    SELECT
      product_id,
      user_id,
      row_number() OVER (
        PARTITION BY user_id
        ORDER BY
          (public.boost_plan_priority(plan_name)
            + LEAST(80, GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) / 3600))
            + LEAST(60, GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now())) / 86400))
            - LEAST(220, impressions * 4)
            - LEAST(90, clicks * 3)
          ) DESC,
          started_at ASC
      ) AS seller_rank,
      (public.boost_plan_priority(plan_name)
        + LEAST(80, GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) / 3600))
        + LEAST(60, GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now())) / 86400))
        - LEAST(220, impressions * 4)
        - LEAST(90, clicks * 3)
      ) AS rotation_score
    FROM stats
  )
  SELECT ranked.product_id
  FROM ranked
  WHERE seller_rank <= 3
  ORDER BY rotation_score DESC, product_id
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_boosted_product_ids() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_active_boosted_products(p_limit integer DEFAULT 200)
RETURNS TABLE(product_id uuid, plan_name text, priority integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      b.id AS boost_id,
      b.product_id,
      b.user_id,
      b.plan_name,
      b.started_at,
      b.expires_at,
      COUNT(e.id) FILTER (WHERE e.event_type = 'impression') AS impressions,
      COUNT(e.id) FILTER (WHERE e.event_type IN ('click', 'view')) AS clicks
    FROM public.product_boosts b
    JOIN public.products p ON p.id = b.product_id AND p.moderation_status = 'approved'
    LEFT JOIN public.product_boost_events e
      ON e.boost_id = b.id
      AND e.created_at >= b.started_at
      AND e.created_at <= LEAST(b.expires_at, now())
    WHERE b.is_active = true
      AND b.expires_at > now()
    GROUP BY b.id, b.product_id, b.user_id, b.plan_name, b.started_at, b.expires_at
  ), ranked AS (
    SELECT
      product_id,
      user_id,
      plan_name,
      public.boost_plan_priority(plan_name) AS priority,
      row_number() OVER (
        PARTITION BY user_id
        ORDER BY
          (public.boost_plan_priority(plan_name)
            + LEAST(80, GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) / 3600))
            + LEAST(60, GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now())) / 86400))
            - LEAST(220, impressions * 4)
            - LEAST(90, clicks * 3)
          ) DESC,
          started_at ASC
      ) AS seller_rank,
      (public.boost_plan_priority(plan_name)
        + LEAST(80, GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) / 3600))
        + LEAST(60, GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now())) / 86400))
        - LEAST(220, impressions * 4)
        - LEAST(90, clicks * 3)
      ) AS rotation_score
    FROM stats
  )
  SELECT ranked.product_id, ranked.plan_name, ranked.priority
  FROM ranked
  WHERE seller_rank <= 3
  ORDER BY rotation_score DESC, priority DESC, product_id
  LIMIT LEAST(GREATEST(coalesce(p_limit, 200), 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public.get_active_boosted_products(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_boost_event(
  p_product_id uuid,
  p_event_type text DEFAULT 'impression',
  p_source text DEFAULT 'marketplace',
  p_session_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boost record;
  v_user uuid;
BEGIN
  IF p_product_id IS NULL OR p_event_type NOT IN ('impression', 'click', 'view', 'contact', 'favorite', 'order') THEN
    RETURN;
  END IF;

  SELECT b.id, b.product_id, b.user_id
  INTO v_boost
  FROM public.product_boosts b
  JOIN public.products p ON p.id = b.product_id AND p.moderation_status = 'approved'
  WHERE b.product_id = p_product_id
    AND b.is_active = true
    AND b.expires_at > now()
  ORDER BY public.boost_plan_priority(b.plan_name) DESC, b.started_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_user := auth.uid();

  IF p_event_type = 'impression' AND p_session_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.product_boost_events e
      WHERE e.boost_id = v_boost.id
        AND e.event_type = 'impression'
        AND e.session_key = p_session_key
        AND e.source = left(coalesce(p_source, 'marketplace'), 80)
        AND e.created_at > now() - interval '6 hours'
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.product_boost_events (boost_id, product_id, seller_id, event_type, source, session_key, user_id)
  VALUES (
    v_boost.id,
    v_boost.product_id,
    v_boost.user_id,
    p_event_type,
    left(coalesce(p_source, 'marketplace'), 80),
    left(coalesce(p_session_key, ''), 120),
    v_user
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_boost_event(uuid, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_product_boost_stats(p_product_id uuid)
RETURNS TABLE(
  impressions bigint,
  views bigint,
  clicks bigint,
  contacts bigint,
  favorites bigint,
  orders bigint,
  conversion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_owner AS (
    SELECT b.id, b.product_id, b.user_id, b.started_at, LEAST(b.expires_at, now()) AS ends_at
    FROM public.product_boosts b
    WHERE b.product_id = p_product_id
      AND b.user_id = auth.uid()
    ORDER BY b.started_at DESC
    LIMIT 1
  ), event_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
      COUNT(*) FILTER (WHERE e.event_type = 'view') AS views,
      COUNT(*) FILTER (WHERE e.event_type = 'click') AS clicks,
      COUNT(*) FILTER (WHERE e.event_type = 'contact') AS contacts,
      COUNT(*) FILTER (WHERE e.event_type = 'favorite') AS favorites
    FROM active_owner a
    LEFT JOIN public.product_boost_events e
      ON e.boost_id = a.id
      AND e.created_at >= a.started_at
      AND e.created_at <= a.ends_at
  ), order_counts AS (
    SELECT COUNT(o.id) AS orders
    FROM active_owner a
    LEFT JOIN public.orders o
      ON o.product_id = a.product_id
      AND o.created_at >= a.started_at
      AND o.created_at <= a.ends_at
      AND lower(coalesce(o.status, '')) NOT IN ('cancelled', 'failed')
  )
  SELECT
    coalesce(ec.impressions, 0)::bigint AS impressions,
    coalesce(ec.views, 0)::bigint AS views,
    coalesce(ec.clicks, 0)::bigint AS clicks,
    coalesce(ec.contacts, 0)::bigint AS contacts,
    coalesce(ec.favorites, 0)::bigint AS favorites,
    coalesce(oc.orders, 0)::bigint AS orders,
    CASE WHEN coalesce(ec.impressions, 0) > 0
      THEN round(((coalesce(oc.orders, 0)::numeric + coalesce(ec.contacts, 0)::numeric) / coalesce(ec.impressions, 0)::numeric) * 100, 2)
      ELSE 0::numeric
    END AS conversion_rate
  FROM event_counts ec CROSS JOIN order_counts oc;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_boost_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_product_click(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET click_count = click_count + 1
  WHERE id = p_product_id;

  PERFORM public.track_boost_event(p_product_id, 'click', 'product_detail', NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_click(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET view_count = view_count + 1
  WHERE id = p_product_id;

  PERFORM public.track_boost_event(p_product_id, 'view', 'product_detail', NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_view(uuid) TO anon, authenticated;