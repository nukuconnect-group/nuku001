
-- Create product_traceability table
CREATE TABLE public.product_traceability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_number TEXT,
  harvest_date DATE,
  origin TEXT,
  weight TEXT,
  temperature TEXT,
  humidity TEXT,
  is_organic BOOLEAN DEFAULT false,
  certifications TEXT[] DEFAULT '{}',
  current_stage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create traceability_events table
CREATE TABLE public.traceability_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  traceability_id UUID NOT NULL REFERENCES public.product_traceability(id) ON DELETE CASCADE,
  stage_index INTEGER NOT NULL DEFAULT 0,
  stage_label TEXT NOT NULL,
  event_description TEXT NOT NULL,
  location TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_traceability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_events ENABLE ROW LEVEL SECURITY;

-- Traceability: anyone can view
CREATE POLICY "Anyone can view traceability"
ON public.product_traceability FOR SELECT
TO public
USING (true);

-- Traceability: producers can manage their own
CREATE POLICY "Producers can insert own traceability"
ON public.product_traceability FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = product_traceability.producer_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Producers can update own traceability"
ON public.product_traceability FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = product_traceability.producer_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Producers can delete own traceability"
ON public.product_traceability FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = product_traceability.producer_id
  AND profiles.user_id = auth.uid()
));

-- Events: anyone can view
CREATE POLICY "Anyone can view traceability events"
ON public.traceability_events FOR SELECT
TO public
USING (true);

-- Events: producers can manage their own (via traceability record)
CREATE POLICY "Producers can insert own events"
ON public.traceability_events FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.product_traceability pt
  JOIN public.profiles p ON p.id = pt.producer_id
  WHERE pt.id = traceability_events.traceability_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Producers can update own events"
ON public.traceability_events FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.product_traceability pt
  JOIN public.profiles p ON p.id = pt.producer_id
  WHERE pt.id = traceability_events.traceability_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Producers can delete own events"
ON public.traceability_events FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.product_traceability pt
  JOIN public.profiles p ON p.id = pt.producer_id
  WHERE pt.id = traceability_events.traceability_id
  AND p.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_product_traceability_updated_at
BEFORE UPDATE ON public.product_traceability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
