
-- Recreate the view with SECURITY INVOKER (safe default)
DROP VIEW IF EXISTS public.active_boosts_public;

CREATE VIEW public.active_boosts_public
WITH (security_invoker = true)
AS
SELECT product_id, is_active
FROM public.product_boosts
WHERE is_active = true;
