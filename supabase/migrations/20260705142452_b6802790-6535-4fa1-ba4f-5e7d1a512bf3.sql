DROP POLICY IF EXISTS "Anyone can read SEO settings" ON public.seo_settings;

CREATE POLICY "Public can read published SEO settings"
ON public.seo_settings
FOR SELECT
TO public
USING (
  is_draft = false
  AND (scheduled_publish_at IS NULL OR scheduled_publish_at <= now())
);

CREATE POLICY "Admins can read all SEO settings"
ON public.seo_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));