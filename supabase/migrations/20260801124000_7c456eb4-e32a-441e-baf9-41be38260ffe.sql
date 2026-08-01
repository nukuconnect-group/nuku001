CREATE TABLE public.user_ai_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  preferred_categories text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  budget_min integer,
  budget_max integer,
  radius_km integer NOT NULL DEFAULT 50,
  preferred_region text,
  notes text,
  use_purchase_history boolean NOT NULL DEFAULT true,
  use_search_history boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_preferences TO authenticated;
GRANT ALL ON public.user_ai_preferences TO service_role;

ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI preferences"
ON public.user_ai_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_ai_preferences_updated_at
BEFORE UPDATE ON public.user_ai_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.locator_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  search_type text NOT NULL,
  product_query text,
  category text,
  region text,
  radius_km integer,
  results_count integer NOT NULL DEFAULT 0,
  tokens_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.locator_searches TO authenticated;
GRANT ALL ON public.locator_searches TO service_role;

ALTER TABLE public.locator_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own locator searches"
ON public.locator_searches FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own locator searches"
ON public.locator_searches FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_locator_searches_user ON public.locator_searches (user_id, created_at DESC);