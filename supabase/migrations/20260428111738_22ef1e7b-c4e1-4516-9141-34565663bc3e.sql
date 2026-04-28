
-- 1) Realtime for visitor map
ALTER TABLE public.analytics_visits REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_visits;

-- 2) Structured delivery method on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS seller_confirmed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON public.orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders(seller_id, status);

-- 3) Trigger: notify seller (and admins for international) when an order becomes confirmed
CREATE OR REPLACE FUNCTION public.notify_order_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_user_id uuid;
  buyer_name text;
  product_name text;
  admin_rec record;
  mode_label text;
BEGIN
  -- Only fire when transitioning into "confirmed"
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    SELECT user_id INTO seller_user_id FROM public.profiles WHERE id = NEW.seller_id;
    SELECT full_name INTO buyer_name FROM public.profiles WHERE id = NEW.buyer_id;
    SELECT name INTO product_name FROM public.products WHERE id = NEW.product_id;

    mode_label := CASE NEW.delivery_method
      WHEN 'pickup' THEN 'Retrait sur place'
      WHEN 'livreur' THEN 'Livreur NukuConnect'
      WHEN 'international' THEN 'Livraison internationale'
      ELSE NEW.delivery_method
    END;

    -- Notify the seller
    IF seller_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, description, product_id)
      VALUES (
        seller_user_id,
        'order',
        '🛒 Nouvelle commande à traiter',
        COALESCE(buyer_name, 'Un client') || ' a commandé ' || COALESCE(product_name, 'un produit')
          || ' (Qté: ' || NEW.quantity || ', Total: ' || NEW.total_price || ' FCFA). Mode: ' || mode_label
          || '. Validez la réception pour démarrer le suivi.',
        NEW.product_id
      );
    END IF;

    -- For international: notify ALL admins so they can handle it with partners
    IF NEW.delivery_method = 'international' THEN
      FOR admin_rec IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, type, title, description, product_id)
        VALUES (
          admin_rec.user_id,
          'order',
          '🌍 Commande internationale à traiter',
          'Nouvelle commande internationale: ' || COALESCE(product_name, 'produit')
            || ' — ' || NEW.total_price || ' FCFA. Coordonner avec les partenaires de transport.',
          NEW.product_id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_order_confirmed ON public.orders;
CREATE TRIGGER trg_notify_order_confirmed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_confirmed();

-- 4) Trigger: when seller confirms (status -> 'preparing'), notify buyer with tracking info
CREATE OR REPLACE FUNCTION public.notify_seller_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_user_id uuid;
  product_name text;
  tracking_msg text;
BEGIN
  IF NEW.seller_confirmed_at IS NOT NULL AND OLD.seller_confirmed_at IS NULL THEN
    SELECT user_id INTO buyer_user_id FROM public.profiles WHERE id = NEW.buyer_id;
    SELECT name INTO product_name FROM public.products WHERE id = NEW.product_id;

    tracking_msg := CASE NEW.delivery_method
      WHEN 'pickup' THEN 'Votre commande est prête. Rendez-vous chez le fournisseur pour le retrait.'
      WHEN 'livreur' THEN 'Le vendeur a préparé votre commande. Un livreur NukuConnect prend le relais — suivez la livraison en temps réel.'
      WHEN 'international' THEN 'Le vendeur a préparé votre commande. NukuConnect coordonne l''expédition internationale via ses partenaires — vous serez notifié à chaque étape.'
      ELSE 'Le vendeur a confirmé la réception de votre commande.'
    END;

    IF buyer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, description, product_id)
      VALUES (
        buyer_user_id,
        'order',
        '📦 Commande prête — ' || COALESCE(product_name, 'produit'),
        tracking_msg,
        NEW.product_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_confirmation ON public.orders;
CREATE TRIGGER trg_notify_seller_confirmation
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_confirmation();
