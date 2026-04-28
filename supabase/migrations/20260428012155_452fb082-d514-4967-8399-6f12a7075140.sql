ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS source_document_url text,
  ADD COLUMN IF NOT EXISTS source_document_name text,
  ADD COLUMN IF NOT EXISTS summary text;