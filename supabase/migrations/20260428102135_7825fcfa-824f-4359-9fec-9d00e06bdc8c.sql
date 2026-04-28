-- 1. Track formation payments for idempotency on tx_reference
CREATE TABLE IF NOT EXISTS public.formation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  formation_id uuid NOT NULL,
  identifier text NOT NULL,
  tx_reference text,
  paygate_status text,
  amount numeric,
  status text NOT NULL DEFAULT 'pending', -- pending | success | failed | expired
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Strict uniqueness on tx_reference and identifier (prevents double-inscription on retries)
CREATE UNIQUE INDEX IF NOT EXISTS formation_payments_tx_reference_uniq
  ON public.formation_payments (tx_reference) WHERE tx_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS formation_payments_identifier_uniq
  ON public.formation_payments (identifier);
CREATE INDEX IF NOT EXISTS formation_payments_user_form_idx
  ON public.formation_payments (user_id, formation_id);

ALTER TABLE public.formation_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own formation payments"
  ON public.formation_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all formation payments"
  ON public.formation_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER formation_payments_set_updated_at
  BEFORE UPDATE ON public.formation_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Private bucket for formation documents (PDFs accessible only via signed URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('formation-documents', 'formation-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Policy: only admins can upload/manage formation documents
CREATE POLICY "Admins manage formation documents"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'formation-documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'formation-documents' AND public.has_role(auth.uid(), 'admin'));

-- Authors of a formation can manage their own documents (path prefix = formation_id)
CREATE POLICY "Authors manage own formation documents"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'formation-documents'
    AND EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.author_user_id = auth.uid()
        AND (storage.foldername(name))[1] = f.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'formation-documents'
    AND EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.author_user_id = auth.uid()
        AND (storage.foldername(name))[1] = f.id::text
    )
  );

-- Enrolled users can READ their formation document via signed URL — but signed URLs bypass RLS
-- so we keep the bucket private and rely on a server-side signed URL function (below).

-- 3. SECURITY DEFINER helper to issue a signed URL only if the caller is enrolled (or admin/author)
CREATE OR REPLACE FUNCTION public.can_access_formation_document(p_formation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Admins
    public.has_role(auth.uid(), 'admin')
    -- Author
    OR EXISTS (SELECT 1 FROM public.formations f WHERE f.id = p_formation_id AND f.author_user_id = auth.uid())
    -- Free formation: anyone authenticated
    OR EXISTS (SELECT 1 FROM public.formations f WHERE f.id = p_formation_id AND COALESCE(f.is_paid, false) = false)
    -- Paid formation: only enrolled users
    OR EXISTS (
      SELECT 1 FROM public.formation_progress fp
      WHERE fp.formation_id = p_formation_id
        AND fp.user_id = auth.uid()
    );
$$;