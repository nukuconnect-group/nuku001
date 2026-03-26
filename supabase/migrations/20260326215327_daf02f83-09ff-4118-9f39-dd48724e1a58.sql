
-- Table profils livreur dédiée
CREATE TABLE public.driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_id uuid NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'moto',
  license_plate text,
  is_available boolean NOT NULL DEFAULT false,
  current_lat numeric,
  current_lng numeric,
  rating numeric DEFAULT 5.0,
  total_deliveries integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  zone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table des livraisons
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  driver_id uuid REFERENCES public.driver_profiles(id),
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_address text,
  dropoff_lat numeric,
  dropoff_lng numeric,
  dropoff_address text,
  distance_km numeric,
  delivery_fee numeric NOT NULL DEFAULT 0,
  driver_fee numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  driver_current_lat numeric,
  driver_current_lng numeric,
  estimated_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- RLS for driver_profiles
CREATE POLICY "Users can view own driver profile" ON public.driver_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own driver profile" ON public.driver_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own driver profile" ON public.driver_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Authenticated can view available drivers" ON public.driver_profiles
  FOR SELECT TO authenticated USING (is_available = true);

-- RLS for deliveries
CREATE POLICY "Drivers can view assigned deliveries" ON public.deliveries
  FOR SELECT TO authenticated USING (
    driver_id IN (SELECT id FROM public.driver_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Buyers can view own deliveries" ON public.deliveries
  FOR SELECT TO authenticated USING (
    order_id IN (SELECT id FROM public.orders WHERE buyer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY "Available drivers can view pending deliveries" ON public.deliveries
  FOR SELECT TO authenticated USING (
    status = 'pending' AND driver_id IS NULL
    AND EXISTS (SELECT 1 FROM public.driver_profiles WHERE user_id = auth.uid() AND is_available = true)
  );

CREATE POLICY "System can insert deliveries" ON public.deliveries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Drivers can update assigned deliveries" ON public.deliveries
  FOR UPDATE TO authenticated USING (
    driver_id IN (SELECT id FROM public.driver_profiles WHERE user_id = auth.uid())
  );

-- Enable realtime for deliveries
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_profiles;

-- Trigger for updated_at
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
