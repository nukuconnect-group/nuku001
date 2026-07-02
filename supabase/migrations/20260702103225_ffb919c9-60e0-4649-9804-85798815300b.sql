
-- Move delivery OTP off the deliveries table into a buyer-only readable table

CREATE TABLE IF NOT EXISTS public.delivery_otps (
  delivery_id UUID PRIMARY KEY REFERENCES public.deliveries(id) ON DELETE CASCADE,
  otp TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_otps TO authenticated;
GRANT ALL ON public.delivery_otps TO service_role;

ALTER TABLE public.delivery_otps ENABLE ROW LEVEL SECURITY;

-- Only the buyer of the underlying order can read their own OTP
CREATE POLICY "Buyers can view own delivery OTP"
ON public.delivery_otps
FOR SELECT
TO authenticated
USING (
  delivery_id IN (
    SELECT d.id
    FROM public.deliveries d
    JOIN public.orders o ON o.id = d.order_id
    JOIN public.profiles p ON p.id = o.buyer_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE TRIGGER update_delivery_otps_updated_at
BEFORE UPDATE ON public.delivery_otps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill existing OTPs from deliveries into the new table
INSERT INTO public.delivery_otps (delivery_id, otp, verified_at)
SELECT id, delivery_otp, otp_verified_at
FROM public.deliveries
WHERE delivery_otp IS NOT NULL
ON CONFLICT (delivery_id) DO NOTHING;

-- Update the share-token trigger to also seed an OTP into the new table
CREATE OR REPLACE FUNCTION public.generate_delivery_share_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_delivery_otp_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.delivery_otps (delivery_id, otp)
  VALUES (NEW.id, lpad((floor(random() * 1000000))::text, 6, '0'))
  ON CONFLICT (delivery_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_delivery_otp ON public.deliveries;
CREATE TRIGGER trg_create_delivery_otp
AFTER INSERT ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.create_delivery_otp_after_insert();

-- Update verify_delivery_otp to read from delivery_otps
CREATE OR REPLACE FUNCTION public.verify_delivery_otp(p_delivery_id uuid, p_otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery RECORD;
  v_otp TEXT;
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

  IF v_delivery.driver_user_id <> v_caller THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT otp INTO v_otp FROM public.delivery_otps WHERE delivery_id = p_delivery_id;

  IF v_otp IS NULL OR v_otp <> p_otp THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_otp');
  END IF;

  UPDATE public.deliveries
  SET status = 'delivered',
      delivered_at = now(),
      updated_at = now()
  WHERE id = p_delivery_id;

  UPDATE public.delivery_otps
  SET verified_at = now(), updated_at = now()
  WHERE delivery_id = p_delivery_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Update get_my_delivery_otp to read from delivery_otps
CREATE OR REPLACE FUNCTION public.get_my_delivery_otp(p_delivery_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_otp TEXT;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT dot.otp INTO v_otp
  FROM public.delivery_otps dot
  JOIN public.deliveries d ON d.id = dot.delivery_id
  JOIN public.orders o ON o.id = d.order_id
  JOIN public.profiles p ON p.id = o.buyer_id
  WHERE dot.delivery_id = p_delivery_id
    AND p.user_id = v_caller;

  RETURN v_otp;
END;
$function$;

-- Update the status-change notification trigger to fetch OTP from delivery_otps
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF NEW.status = 'in_transit' THEN
    SELECT otp INTO v_otp FROM public.delivery_otps WHERE delivery_id = NEW.id;
    IF v_otp IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, description)
      VALUES (
        v_buyer_user_id,
        'delivery',
        '🔐 Votre code OTP de livraison',
        'Donnez ce code au livreur à la remise : ' || v_otp
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Finally drop the sensitive columns from deliveries
ALTER TABLE public.deliveries
  DROP COLUMN IF EXISTS delivery_otp,
  DROP COLUMN IF EXISTS otp_verified_at;
