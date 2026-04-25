-- Table d'analytics Nuku AI
CREATE TABLE IF NOT EXISTS public.nuku_ai_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  question TEXT NOT NULL,
  country TEXT,
  city TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nuku_ai_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a question"
  ON public.nuku_ai_questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all questions"
  ON public.nuku_ai_questions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_nuku_ai_questions_created_at ON public.nuku_ai_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nuku_ai_questions_user_id ON public.nuku_ai_questions(user_id);

-- Index pour retrouver rapidement un lot par numéro
CREATE INDEX IF NOT EXISTS idx_product_traceability_batch_number ON public.product_traceability(batch_number);

-- Realtime sur profiles pour synchroniser les badges vérifiés
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;