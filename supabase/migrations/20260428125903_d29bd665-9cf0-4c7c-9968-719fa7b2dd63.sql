-- Add draft mode + version history for SEO settings

ALTER TABLE public.seo_settings
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- History table: every meaningful change gets a snapshot
CREATE TABLE IF NOT EXISTS public.seo_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seo_settings_id uuid NOT NULL REFERENCES public.seo_settings(id) ON DELETE CASCADE,
  route text NOT NULL,
  title text,
  description text,
  keywords text,
  og_image_url text,
  og_image_sizes jsonb,
  canonical_path text,
  no_index boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  action text NOT NULL DEFAULT 'update', -- 'create' | 'update' | 'publish' | 'restore'
  changed_by uuid,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_history_settings ON public.seo_settings_history(seo_settings_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_history_route ON public.seo_settings_history(route, created_at DESC);

ALTER TABLE public.seo_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read seo history"
  ON public.seo_settings_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert seo history"
  ON public.seo_settings_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger: snapshot on every UPDATE / INSERT into seo_settings
CREATE OR REPLACE FUNCTION public.snapshot_seo_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_action text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF (OLD.is_draft IS DISTINCT FROM NEW.is_draft) AND NEW.is_draft = false THEN
    v_action := 'publish';
  ELSE
    v_action := 'update';
  END IF;

  INSERT INTO public.seo_settings_history (
    seo_settings_id, route, title, description, keywords, og_image_url,
    og_image_sizes, canonical_path, no_index, is_draft, action,
    changed_by, changed_by_email
  ) VALUES (
    NEW.id, NEW.route, NEW.title, NEW.description, NEW.keywords, NEW.og_image_url,
    NEW.og_image_sizes, NEW.canonical_path, NEW.no_index, NEW.is_draft, v_action,
    auth.uid(), v_email
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_seo_settings ON public.seo_settings;
CREATE TRIGGER trg_snapshot_seo_settings
  AFTER INSERT OR UPDATE ON public.seo_settings
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_seo_settings();