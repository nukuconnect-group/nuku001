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
BEGIN
  -- Get product info
  SELECT p.*, pr.user_id as seller_uid, pr.full_name as seller_name
  INTO product_record
  FROM public.products p
  JOIN public.profiles pr ON pr.id = p.producer_id
  WHERE p.id = NEW.product_id;

  IF product_record IS NULL THEN RETURN NEW; END IF;

  seller_user_id := product_record.seller_uid;

  -- Decrement stock
  UPDATE public.products
  SET quantity_available = GREATEST(quantity_available - NEW.quantity, 0),
      stock_status = CASE 
        WHEN GREATEST(quantity_available - NEW.quantity, 0) = 0 THEN 'out_of_stock'
        WHEN GREATEST(quantity_available - NEW.quantity, 0) < 5 THEN 'low_stock'
        ELSE stock_status
      END
  WHERE id = NEW.product_id;

  -- Get seller subscription plan
  SELECT s.plan INTO seller_plan
  FROM public.subscriptions s
  WHERE s.user_id = seller_user_id AND s.status = 'active'
  LIMIT 1;

  -- Commission rate based on subscription plan
  CASE COALESCE(seller_plan, 'free')
    WHEN 'business' THEN commission_rate := 0.02;
    WHEN 'pro' THEN commission_rate := 0.05;
    ELSE commission_rate := 0.08; -- free plan
  END CASE;

  commission_amount := ROUND(NEW.total_price * commission_rate);
  net_amount := NEW.total_price - commission_amount;

  -- Get buyer name
  SELECT full_name INTO buyer_name FROM public.profiles WHERE id = NEW.buyer_id;

  -- Notify seller with commission details
  INSERT INTO public.notifications (user_id, type, title, description, product_id)
  VALUES (
    seller_user_id,
    'order',
    '💰 Nouvelle vente !',
    COALESCE(buyer_name, 'Un acheteur') || ' a acheté ' || NEW.quantity || ' ' || product_record.unit || ' de "' || product_record.name || '". Montant: ' || NEW.total_price || ' FCFA. Commission NukuConnect (' || (commission_rate * 100)::int || '% - plan ' || COALESCE(seller_plan, 'free') || '): ' || commission_amount || ' FCFA. Votre gain net: ' || net_amount || ' FCFA.',
    NEW.product_id
  );

  RETURN NEW;
END;
$function$;