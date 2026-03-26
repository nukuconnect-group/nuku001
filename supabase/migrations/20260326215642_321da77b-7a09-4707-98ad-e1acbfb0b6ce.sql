
-- Trigger to notify buyer when delivery status changes
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  buyer_user_id uuid;
  driver_name text;
  status_text text;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  
  -- Get buyer user_id from the order
  SELECT p.user_id INTO buyer_user_id
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.buyer_id
  WHERE o.id = NEW.order_id
  LIMIT 1;
  
  -- Get driver name
  IF NEW.driver_id IS NOT NULL THEN
    SELECT p.full_name INTO driver_name
    FROM public.driver_profiles dp
    JOIN public.profiles p ON p.id = dp.profile_id
    WHERE dp.id = NEW.driver_id;
  END IF;
  
  -- Status text
  CASE NEW.status
    WHEN 'accepted' THEN status_text := 'Un livreur a accepté votre commande';
    WHEN 'picked_up' THEN status_text := 'Votre commande a été récupérée par le livreur';
    WHEN 'in_transit' THEN status_text := 'Votre commande est en cours de livraison';
    WHEN 'delivered' THEN status_text := 'Votre commande a été livrée !';
    ELSE status_text := 'Statut de livraison mis à jour';
  END CASE;
  
  -- Notify buyer
  IF buyer_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, description)
    VALUES (
      buyer_user_id,
      'delivery',
      CASE NEW.status
        WHEN 'accepted' THEN '🚚 Livreur assigné'
        WHEN 'picked_up' THEN '📦 Commande récupérée'
        WHEN 'in_transit' THEN '🛵 Livraison en cours'
        WHEN 'delivered' THEN '✅ Commande livrée'
        ELSE '📦 Mise à jour livraison'
      END,
      status_text || CASE WHEN driver_name IS NOT NULL THEN ' - ' || driver_name ELSE '' END
    );
  END IF;

  -- Notify driver for new pending deliveries
  IF NEW.status = 'pending' AND NEW.driver_id IS NULL THEN
    -- Notify all available drivers
    INSERT INTO public.notifications (user_id, type, title, description)
    SELECT dp.user_id, 'delivery', '🆕 Nouvelle livraison disponible',
      'Une nouvelle livraison est disponible' || 
      CASE WHEN NEW.distance_km IS NOT NULL THEN ' (' || ROUND(NEW.distance_km::numeric, 1) || ' km)' ELSE '' END
    FROM public.driver_profiles dp
    WHERE dp.is_available = true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_status_change();

-- Also trigger on insert for new deliveries
CREATE TRIGGER on_delivery_created
  AFTER INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_status_change();
