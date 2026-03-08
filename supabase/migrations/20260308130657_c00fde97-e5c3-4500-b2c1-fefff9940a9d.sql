
-- Notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'product',
  title TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Function to notify all buyers when a new product is published
CREATE OR REPLACE FUNCTION public.notify_new_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  producer_name TEXT;
  buyer RECORD;
BEGIN
  SELECT full_name INTO producer_name FROM public.profiles WHERE id = NEW.producer_id;
  
  FOR buyer IN 
    SELECT user_id FROM public.profiles WHERE user_type = 'buyer'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, description, product_id)
    VALUES (
      buyer.user_id,
      'product',
      'Nouveau produit disponible',
      COALESCE(producer_name, 'Un producteur') || ' a publié "' || NEW.name || '"',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_product_notify
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_product();
