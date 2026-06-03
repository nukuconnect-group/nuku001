
-- Buyer can cancel a pending/confirmed order (not yet shipped) and delete failed/cancelled orders
CREATE OR REPLACE FUNCTION public.buyer_cancel_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_buyer_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  SELECT user_id INTO v_buyer_user FROM public.profiles WHERE id = v_order.buyer_id;
  IF v_buyer_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_order.status NOT IN ('pending','confirmed') THEN
    RAISE EXCEPTION 'cannot_cancel_in_status_%', v_order.status;
  END IF;
  UPDATE public.orders SET status='cancelled', updated_at=now() WHERE id=p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.buyer_delete_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_buyer_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  SELECT user_id INTO v_buyer_user FROM public.profiles WHERE id = v_order.buyer_id;
  IF v_buyer_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  -- Only allow deleting cancelled or stale-unpaid orders (no seller confirmation, no completed status)
  IF v_order.status IN ('paid','confirmed','processing','shipped','delivered','completed')
     AND v_order.seller_confirmed_at IS NOT NULL THEN
    RAISE EXCEPTION 'cannot_delete_active_order';
  END IF;
  DELETE FROM public.orders WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.buyer_cancel_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_delete_order(uuid) TO authenticated;
