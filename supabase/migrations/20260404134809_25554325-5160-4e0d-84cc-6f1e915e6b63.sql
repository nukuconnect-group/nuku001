
-- Create driver_ratings table
CREATE TABLE public.driver_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(delivery_id, user_id)
);

-- Enable RLS
ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view all driver ratings"
  ON public.driver_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can rate their own deliveries"
  ON public.driver_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.driver_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.driver_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update driver average rating
CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.driver_profiles
  SET rating = (
    SELECT ROUND(AVG(r.rating)::numeric, 1)
    FROM public.driver_ratings r
    WHERE r.driver_id = COALESCE(NEW.driver_id, OLD.driver_id)
  )
  WHERE id = COALESCE(NEW.driver_id, OLD.driver_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_driver_rating_on_change
  AFTER INSERT OR UPDATE OR DELETE ON public.driver_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_rating();
