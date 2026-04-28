-- Create public bucket for SEO OG images
INSERT INTO storage.buckets (id, name, public)
VALUES ('seo-og-images', 'seo-og-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public read seo-og-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'seo-og-images');

-- Admin write (insert/update/delete)
CREATE POLICY "Admins manage seo-og-images insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seo-og-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage seo-og-images update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'seo-og-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage seo-og-images delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'seo-og-images' AND public.has_role(auth.uid(), 'admin'));