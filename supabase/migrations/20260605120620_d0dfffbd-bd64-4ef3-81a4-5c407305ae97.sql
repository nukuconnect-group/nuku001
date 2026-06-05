
-- 1) Promo: original price column on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS original_price numeric;

-- 2) Disable noisy "validation en attente" auto reminders (keep function for cron compat)
CREATE OR REPLACE FUNCTION public.send_buyer_seller_validation_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentionally disabled per product decision: do not spam buyer/seller
  -- with "pending validation" reminders. Buyer is now notified only when
  -- the seller actually confirms the order (see confirm_seller_order).
  RETURN 0;
END;
$$;

-- 3) Notify buyer when seller confirms an order
CREATE OR REPLACE FUNCTION public.confirm_seller_order(_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_seller_user_id uuid;
  v_buyer_user_id uuid;
  v_product_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;

  SELECT user_id INTO v_seller_user_id FROM public.profiles WHERE id = v_order.seller_id;

  IF v_seller_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF v_order.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être validée';
  END IF;

  -- Only notify on transition (was NULL, now set)
  IF v_order.seller_confirmed_at IS NULL THEN
    UPDATE public.orders
      SET seller_confirmed_at = now(), updated_at = now()
      WHERE id = _order_id;

    SELECT user_id INTO v_buyer_user_id FROM public.profiles WHERE id = v_order.buyer_id;
    SELECT name INTO v_product_name FROM public.products WHERE id = v_order.product_id;

    IF v_buyer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, description, product_id)
      VALUES (
        v_buyer_user_id,
        'order',
        '✅ Commande validée par le vendeur',
        'Votre commande "' || COALESCE(v_product_name, 'produit') || '" (#' || LEFT(_order_id::text, 8) || ') vient d''être validée par le vendeur. Elle est en cours de préparation.',
        v_order.product_id
      );
    END IF;
  ELSE
    UPDATE public.orders SET updated_at = now() WHERE id = _order_id;
  END IF;

  RETURN json_build_object('success', true, 'order_id', _order_id);
END;
$$;
