-- Restrict promo_codes table reads to admins only; add validation RPC for minimal-info checks
DROP POLICY IF EXISTS "Authenticated users can view active promo codes" ON public.promo_codes;

CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text, _order_amount numeric DEFAULT NULL)
RETURNS TABLE (
  valid boolean,
  discount_type text,
  discount_value numeric,
  message text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Authentification requise'::text;
    RETURN;
  END IF;

  SELECT pc.discount_type, pc.discount_value, pc.max_uses, pc.current_uses,
         pc.min_order_amount, pc.expires_at, pc.is_active
  INTO rec
  FROM public.promo_codes pc
  WHERE upper(pc.code) = upper(_code)
  LIMIT 1;

  IF NOT FOUND OR NOT rec.is_active THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Code invalide'::text;
    RETURN;
  END IF;

  IF rec.expires_at IS NOT NULL AND rec.expires_at <= now() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Code expiré'::text;
    RETURN;
  END IF;

  IF rec.max_uses IS NOT NULL AND rec.current_uses >= rec.max_uses THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Code épuisé'::text;
    RETURN;
  END IF;

  IF rec.min_order_amount IS NOT NULL AND _order_amount IS NOT NULL AND _order_amount < rec.min_order_amount THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Montant minimum non atteint'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, rec.discount_type, rec.discount_value, 'OK'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;

-- Allow admins to read suppressed_emails directly
CREATE POLICY "Admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));