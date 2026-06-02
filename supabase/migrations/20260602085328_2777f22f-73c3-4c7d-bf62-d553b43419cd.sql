CREATE OR REPLACE FUNCTION public.admin_update_order_status(_order_id uuid, _status text, _note text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY['pending','confirmed','processing','shipped','completed','delivered','paid','cancelled'];
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF _status IS NULL OR NOT (_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  UPDATE public.orders
  SET status = _status,
      notes = CASE WHEN _note IS NULL THEN notes ELSE _note END,
      seller_confirmed_at = CASE
        WHEN _status IN ('confirmed','processing','shipped','completed','delivered','paid') THEN COALESCE(seller_confirmed_at, now())
        ELSE seller_confirmed_at
      END,
      updated_at = now()
  WHERE id = _order_id;

  RETURN json_build_object('success', true, 'order_id', _order_id, 'status', _status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text) TO authenticated;