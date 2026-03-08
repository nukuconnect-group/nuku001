
-- Table to store product boosts
CREATE TABLE public.product_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan_name text NOT NULL DEFAULT 'basic',
  days integer NOT NULL DEFAULT 3,
  price numeric NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_boosts ENABLE ROW LEVEL SECURITY;

-- Everyone can see active boosts (needed to display boosted products)
CREATE POLICY "Anyone can view active boosts"
  ON public.product_boosts FOR SELECT
  USING (true);

-- Users can insert their own boosts
CREATE POLICY "Users can create their own boosts"
  ON public.product_boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own boosts
CREATE POLICY "Users can update their own boosts"
  ON public.product_boosts FOR UPDATE
  USING (auth.uid() = user_id);
