
-- 1. driver_kyc_submissions table
CREATE TABLE public.driver_kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  id_type text NOT NULL DEFAULT 'cni',
  id_number text,
  id_front_url text,
  id_back_url text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kyc" ON public.driver_kyc_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit kyc" ON public.driver_kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kyc" ON public.driver_kyc_submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all kyc" ON public.driver_kyc_submissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update kyc" ON public.driver_kyc_submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_driver_kyc_updated_at BEFORE UPDATE ON public.driver_kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-kyc', 'driver-kyc', false);

CREATE POLICY "Users can upload own kyc docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'driver-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own kyc docs" ON storage.objects FOR SELECT USING (bucket_id = 'driver-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all kyc docs" ON storage.objects FOR SELECT USING (bucket_id = 'driver-kyc' AND public.has_role(auth.uid(), 'admin'));

-- 3. Trigger for referral earnings on order creation
CREATE OR REPLACE FUNCTION public.create_referral_earning_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_user_id uuid;
  ref_record RECORD;
  commission numeric;
BEGIN
  -- Get buyer's user_id from profile
  SELECT user_id INTO buyer_user_id FROM public.profiles WHERE id = NEW.buyer_id;
  IF buyer_user_id IS NULL THEN RETURN NEW; END IF;

  -- Check if this buyer was referred
  SELECT r.id, r.referrer_id INTO ref_record
  FROM public.referrals r
  WHERE r.referred_user_id = buyer_user_id AND r.status = 'active'
  LIMIT 1;

  IF ref_record.id IS NULL THEN RETURN NEW; END IF;

  -- Calculate 3% commission
  commission := ROUND(NEW.total_price * 0.03, 0);
  IF commission <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.referral_earnings (referrer_id, referral_id, amount, source_type, source_amount, commission_rate, description)
  VALUES (ref_record.referrer_id, ref_record.id, commission, 'purchase', NEW.total_price, 0.03, 'Commission sur achat #' || LEFT(NEW.id::text, 8));

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_referral_earning_on_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_earning_on_order();

-- 4. Attach delivery notification trigger
CREATE TRIGGER trg_notify_delivery_status
AFTER UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.notify_delivery_status_change();

-- Also fire on INSERT for new pending deliveries
CREATE TRIGGER trg_notify_delivery_insert
AFTER INSERT ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.notify_delivery_status_change();
