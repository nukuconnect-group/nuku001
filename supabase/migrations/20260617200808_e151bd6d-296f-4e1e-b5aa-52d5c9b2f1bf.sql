
-- 1. New free subscriptions: no expiration, no renewal counter usage
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, max_products, expires_at, free_renewals_used, status)
  VALUES (NEW.id, 'free', 5, NULL, 0, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Existing free subscriptions: remove expiration, reactivate
UPDATE public.subscriptions
SET expires_at = NULL,
    status = 'active',
    updated_at = now()
WHERE plan = 'free';

-- 3. Existing paid subscriptions: ensure validity of 12 months from started_at when shorter
UPDATE public.subscriptions
SET expires_at = COALESCE(started_at, now()) + interval '365 days',
    status = 'active',
    updated_at = now()
WHERE plan <> 'free'
  AND (expires_at IS NULL OR expires_at < COALESCE(started_at, now()) + interval '365 days');
