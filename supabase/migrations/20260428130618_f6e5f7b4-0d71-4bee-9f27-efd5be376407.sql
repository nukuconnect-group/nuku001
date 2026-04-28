CREATE TABLE IF NOT EXISTS public.seo_allowed_routes (
  route text PRIMARY KEY,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_allowed_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read allowed routes" ON public.seo_allowed_routes;
CREATE POLICY "Anyone can read allowed routes"
  ON public.seo_allowed_routes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage allowed routes" ON public.seo_allowed_routes;
CREATE POLICY "Admins manage allowed routes"
  ON public.seo_allowed_routes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.seo_allowed_routes (route) VALUES
  ('/'), ('/a-propos'), ('/admin'), ('/adresse-livraison'), ('/affiliation'),
  ('/aide'), ('/auth'), ('/blog'), ('/buyer-dashboard'), ('/categories'),
  ('/contact'), ('/dashboard'), ('/devenir-fournisseur'), ('/driver-dashboard'),
  ('/faq'), ('/faq-nuku-ai'), ('/favoris'), ('/formations'), ('/jetons'),
  ('/learner-dashboard'), ('/legal'), ('/marketplace'), ('/mes-commandes'),
  ('/messages'), ('/moderation'), ('/mon-compte'), ('/notifications'),
  ('/nuku-ai'), ('/nuku-ai/faq'), ('/panier'), ('/plans'), ('/politique-achat'),
  ('/politique-remboursement'), ('/premium'), ('/privacy'), ('/producteurs'),
  ('/reset-password'), ('/settings'), ('/suivi-livraison'), ('/terms'),
  ('/tokens'), ('/tracabilite'), ('/unsubscribe')
ON CONFLICT (route) DO NOTHING;

CREATE OR REPLACE FUNCTION public.normalize_seo_slug(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  v := lower(trim(input));
  IF v = '__global__' THEN RETURN v; END IF;
  IF v !~ '^/' THEN v := '/' || v; END IF;
  v := regexp_replace(v, '[^a-z0-9\-/]', '', 'g');
  v := regexp_replace(v, '/+', '/', 'g');
  IF length(v) > 1 AND right(v, 1) = '/' THEN
    v := left(v, length(v) - 1);
  END IF;
  RETURN v;
END;
$$;

ALTER TABLE public.seo_settings
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_seo_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
BEGIN
  v_norm := public.normalize_seo_slug(NEW.route);
  IF v_norm IS NULL OR v_norm = '' THEN
    RAISE EXCEPTION 'invalid_slug: route is required';
  END IF;
  NEW.route := v_norm;

  IF NEW.canonical_path IS NOT NULL AND NEW.canonical_path <> '' THEN
    NEW.canonical_path := public.normalize_seo_slug(NEW.canonical_path);
  END IF;

  IF NEW.is_draft = false AND NEW.route <> '__global__' THEN
    IF NOT EXISTS (SELECT 1 FROM public.seo_allowed_routes WHERE route = NEW.route) THEN
      RAISE EXCEPTION 'unknown_route: % is not a registered application route. Save as draft or add it to seo_allowed_routes.', NEW.route
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.scheduled_publish_at IS NOT NULL AND NEW.scheduled_publish_at <= now() THEN
    NEW.scheduled_publish_at := NULL;
    NEW.is_draft := false;
    NEW.published_at := COALESCE(NEW.published_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_seo_settings ON public.seo_settings;
CREATE TRIGGER trg_validate_seo_settings
  BEFORE INSERT OR UPDATE ON public.seo_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_seo_settings();

CREATE OR REPLACE FUNCTION public.publish_due_seo_settings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.seo_settings
    SET is_draft = false,
        published_at = now(),
        scheduled_publish_at = NULL,
        updated_at = now()
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
      AND (route = '__global__' OR EXISTS (SELECT 1 FROM public.seo_allowed_routes ar WHERE ar.route = seo_settings.route))
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_due_seo_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_seo_slug(text) FROM PUBLIC, anon, authenticated;