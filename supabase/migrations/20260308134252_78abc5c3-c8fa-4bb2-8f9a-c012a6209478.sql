
-- Create demands table for buyers to express their purchase needs
CREATE TABLE public.demands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT DEFAULT 'kg',
  budget NUMERIC,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Everyone can view demands
CREATE POLICY "Demands are viewable by everyone" ON public.demands FOR SELECT USING (true);

-- Users can create their own demands
CREATE POLICY "Users can create demands" ON public.demands FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own demands
CREATE POLICY "Users can update own demands" ON public.demands FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own demands
CREATE POLICY "Users can delete own demands" ON public.demands FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.demands;

-- Trigger to notify relevant producers when a demand is created
CREATE OR REPLACE FUNCTION public.notify_new_demand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  buyer_name TEXT;
  producer RECORD;
BEGIN
  SELECT full_name INTO buyer_name FROM public.profiles WHERE id = NEW.profile_id;
  
  FOR producer IN 
    SELECT DISTINCT p.user_id FROM public.profiles p
    JOIN public.products pr ON pr.producer_id = p.id
    WHERE pr.category = NEW.category
  LOOP
    INSERT INTO public.notifications (user_id, type, title, description)
    VALUES (
      producer.user_id,
      'demand',
      'Nouvelle demande d''achat',
      COALESCE(buyer_name, 'Un acheteur') || ' recherche "' || NEW.title || '" dans votre catégorie'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_demand_created
  AFTER INSERT ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_demand();

-- Update notify_new_product to only notify buyers in relevant categories
CREATE OR REPLACE FUNCTION public.notify_new_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  producer_name TEXT;
  buyer RECORD;
BEGIN
  SELECT full_name INTO producer_name FROM public.profiles WHERE id = NEW.producer_id;
  
  -- Notify buyers who have demands in this category, plus all buyers
  FOR buyer IN 
    SELECT DISTINCT user_id FROM public.profiles WHERE user_type = 'buyer'
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
