-- 1. Add share_token, delivery_otp, otp_verified_at to deliveries
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS delivery_otp TEXT,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_deliveries_share_token ON public.deliveries(share_token);

-- 2. Trigger to generate share_token + OTP automatically on insert
CREATE OR REPLACE FUNCTION public.generate_delivery_share_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  IF NEW.delivery_otp IS NULL THEN
    NEW.delivery_otp := lpad((floor(random() * 1000000))::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_delivery_share_token ON public.deliveries;
CREATE TRIGGER trg_generate_delivery_share_token
  BEFORE INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_delivery_share_token();

-- Backfill for existing rows without token/otp
UPDATE public.deliveries
SET share_token = encode(gen_random_bytes(16), 'hex')
WHERE share_token IS NULL;

UPDATE public.deliveries
SET delivery_otp = lpad((floor(random() * 1000000))::text, 6, '0')
WHERE delivery_otp IS NULL;

-- 3. Create delivery_track_points table for GPS history
CREATE TABLE IF NOT EXISTS public.delivery_track_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  accuracy NUMERIC,
  speed NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_track_points_delivery_id_time
  ON public.delivery_track_points(delivery_id, recorded_at);

ALTER TABLE public.delivery_track_points ENABLE ROW LEVEL SECURITY;

-- The driver assigned to the delivery can insert points
CREATE POLICY "Driver can insert own delivery track points"
ON public.delivery_track_points
FOR INSERT
TO authenticated
WITH CHECK (
  delivery_id IN (
    SELECT d.id FROM public.deliveries d
    JOIN public.driver_profiles dp ON dp.id = d.driver_id
    WHERE dp.user_id = auth.uid()
  )
);

-- Buyer, driver, seller and admin can view track points
CREATE POLICY "Participants can view delivery track points"
ON public.delivery_track_points
FOR SELECT
TO authenticated
USING (
  delivery_id IN (
    SELECT d.id FROM public.deliveries d
    LEFT JOIN public.driver_profiles dp ON dp.id = d.driver_id
    LEFT JOIN public.orders o ON o.id = d.order_id
    LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
    LEFT JOIN public.profiles sp ON sp.id = o.seller_id
    WHERE dp.user_id = auth.uid()
       OR bp.user_id = auth.uid()
       OR sp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 4. Public tracking function (no auth) — accessible via share_token only
CREATE OR REPLACE FUNCTION public.get_public_delivery_tracking(p_token TEXT)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', d.id,
    'status', d.status,
    'pickup_lat', d.pickup_lat,
    'pickup_lng', d.pickup_lng,
    'pickup_address', d.pickup_address,
    'dropoff_lat', d.dropoff_lat,
    'dropoff_lng', d.dropoff_lng,
    'dropoff_address', d.dropoff_address,
    'driver_current_lat', d.driver_current_lat,
    'driver_current_lng', d.driver_current_lng,
    'distance_km', d.distance_km,
    'estimated_minutes', d.estimated_minutes,
    'accepted_at', d.accepted_at,
    'picked_up_at', d.picked_up_at,
    'delivered_at', d.delivered_at,
    'driver_name', pr.full_name,
    'driver_avatar', pr.avatar_url,
    'driver_vehicle', dp.vehicle_type,
    'driver_rating', dp.rating
  ) INTO result
  FROM public.deliveries d
  LEFT JOIN public.driver_profiles dp ON dp.id = d.driver_id
  LEFT JOIN public.profiles pr ON pr.id = dp.profile_id
  WHERE d.share_token = p_token;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_delivery_tracking(TEXT) TO anon, authenticated;

-- 5. Public function to get the delivery trace history (for recap)
CREATE OR REPLACE FUNCTION public.get_public_delivery_trace(p_token TEXT)
RETURNS TABLE(lat NUMERIC, lng NUMERIC, recorded_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT tp.lat, tp.lng, tp.recorded_at
  FROM public.delivery_track_points tp
  JOIN public.deliveries d ON d.id = tp.delivery_id
  WHERE d.share_token = p_token
  ORDER BY tp.recorded_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_delivery_trace(TEXT) TO anon, authenticated;

-- 6. OTP verification function — confirms delivery on success
CREATE OR REPLACE FUNCTION public.verify_delivery_otp(p_delivery_id UUID, p_otp TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery RECORD;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT d.*, dp.user_id AS driver_user_id
  INTO v_delivery
  FROM public.deliveries d
  LEFT JOIN public.driver_profiles dp ON dp.id = d.driver_id
  WHERE d.id = p_delivery_id;

  IF v_delivery IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  -- Only the assigned driver can verify
  IF v_delivery.driver_user_id <> v_caller THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_delivery.delivery_otp IS NULL OR v_delivery.delivery_otp <> p_otp THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_otp');
  END IF;

  UPDATE public.deliveries
  SET status = 'delivered',
      delivered_at = now(),
      otp_verified_at = now(),
      updated_at = now()
  WHERE id = p_delivery_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_delivery_otp(UUID, TEXT) TO authenticated;

-- 7. Function for buyer to retrieve their own delivery OTP
CREATE OR REPLACE FUNCTION public.get_my_delivery_otp(p_delivery_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT d.delivery_otp INTO v_otp
  FROM public.deliveries d
  JOIN public.orders o ON o.id = d.order_id
  JOIN public.profiles p ON p.id = o.buyer_id
  WHERE d.id = p_delivery_id
    AND p.user_id = auth.uid();

  RETURN v_otp;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_delivery_otp(UUID) TO authenticated;

-- 8. Trigger — when a delivery status changes, send notification to buyer
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_user_id UUID;
  v_title TEXT;
  v_desc TEXT;
  v_otp TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT p.user_id INTO v_buyer_user_id
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.buyer_id
  WHERE o.id = NEW.order_id;

  IF v_buyer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'accepted' THEN
      v_title := '🚚 Livreur en route';
      v_desc := 'Un livreur a pris votre commande et se dirige vers le vendeur. Suivez en direct !';
    WHEN 'picking' THEN
      v_title := '📍 Livreur arrive au point de collecte';
      v_desc := 'Le livreur arrive bientôt chez le vendeur pour récupérer votre commande.';
    WHEN 'picked_up' THEN
      v_title := '📦 Commande récupérée';
      v_desc := 'Votre colis a été récupéré et part maintenant vers vous.';
    WHEN 'in_transit' THEN
      v_title := '🛵 En route vers vous';
      v_desc := 'Votre livreur arrive ! Préparez le code OTP pour la remise.';
    WHEN 'delivered' THEN
      v_title := '✅ Livraison terminée';
      v_desc := 'Votre commande a bien été livrée. Merci d''avoir utilisé Nukuconnect !';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (v_buyer_user_id, 'delivery', v_title, v_desc);

  -- Also send the OTP to the buyer when the driver is in transit (just before delivery)
  IF NEW.status = 'in_transit' AND NEW.delivery_otp IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, description)
    VALUES (
      v_buyer_user_id,
      'delivery',
      '🔐 Votre code OTP de livraison',
      'Donnez ce code au livreur à la remise : ' || NEW.delivery_otp
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_delivery_status_change ON public.deliveries;
CREATE TRIGGER trg_notify_delivery_status_change
  AFTER INSERT OR UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_status_change();

-- Enable realtime on the new track points table
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_track_points;