CREATE OR REPLACE FUNCTION public.handle_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  seller_user_id uuid;
  buyer_name text;
  seller_plan text;
  commission_rate numeric;
  commission_amount numeric;
  net_amount numeric;
  payment_confirmed boolean := false;
BEGIN
  -- Never reserve/decrement stock while the order is only being created.
  -- Marketplace stock changes are allowed only after the payment transaction is successful.
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT (
    NEW.status IN ('confirmed', 'completed')
    AND OLD.status IS DISTINCT FROM NEW.status
    AND COALESCE(OLD.status, '') NOT IN ('confirmed', 'completed')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.moneroo_transactions mt
    WHERE mt.context = 'cart'
      AND mt.status = 'success'
      AND mt.completed_at IS NOT NULL
      AND (
        mt.context_data->'orderIds' ? NEW.id::text
        OR concat(',', COALESCE(mt.context_data->>'orderIdsCsv', ''), ',') LIKE '%,' || NEW.id::text || ',%'
      )
  ) INTO payment_confirmed;

  IF NOT payment_confirmed THEN
    RETURN NEW;
  END IF;

  SELECT p.*, pr.user_id as seller_uid, pr.full_name as seller_name
  INTO product_record
  FROM public.products p
  JOIN public.profiles pr ON pr.id = p.producer_id
  WHERE p.id = NEW.product_id;

  IF product_record IS NULL THEN RETURN NEW; END IF;

  seller_user_id := product_record.seller_uid;

  UPDATE public.products
  SET quantity_available = GREATEST(quantity_available - NEW.quantity, 0),
      stock_status = CASE
        WHEN GREATEST(quantity_available - NEW.quantity, 0) = 0 THEN 'out_of_stock'
        WHEN GREATEST(quantity_available - NEW.quantity, 0) < 5 THEN 'low_stock'
        ELSE stock_status
      END
  WHERE id = NEW.product_id;

  SELECT s.plan INTO seller_plan
  FROM public.subscriptions s
  WHERE s.user_id = seller_user_id AND s.status = 'active'
  LIMIT 1;

  CASE COALESCE(seller_plan, 'free')
    WHEN 'enterprise' THEN commission_rate := 0.02;
    WHEN 'business' THEN commission_rate := 0.02;
    WHEN 'premium' THEN commission_rate := 0.03;
    WHEN 'standard' THEN commission_rate := 0.05;
    WHEN 'pro' THEN commission_rate := 0.05;
    ELSE commission_rate := 0.08;
  END CASE;

  commission_amount := ROUND(NEW.total_price * commission_rate);
  net_amount := NEW.total_price - commission_amount;

  SELECT full_name INTO buyer_name FROM public.profiles WHERE id = NEW.buyer_id;

  IF seller_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, description, product_id)
    VALUES (
      seller_user_id,
      'order',
      '💰 Vente confirmée après paiement',
      COALESCE(buyer_name, 'Un acheteur') || ' a payé ' || NEW.quantity || ' ' || COALESCE(product_record.unit, 'unité') || ' de "' || product_record.name || '". Montant encaissé: ' || NEW.total_price || ' FCFA. Commission NukuConnect (' || (commission_rate * 100)::int || '% - plan ' || COALESCE(seller_plan, 'free') || '): ' || commission_amount || ' FCFA. Gain net estimé: ' || net_amount || ' FCFA.',
      NEW.product_id
    );
  END IF;

  RETURN NEW;
END;
$function$;