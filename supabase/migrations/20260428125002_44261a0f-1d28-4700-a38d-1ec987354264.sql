-- Add og_image_sizes JSONB to store all image variants
ALTER TABLE public.seo_settings
ADD COLUMN IF NOT EXISTS og_image_sizes jsonb DEFAULT '{}'::jsonb;

-- Replace the public listing policy with admin-only listing.
-- Direct CDN URLs to public buckets bypass RLS, so images remain viewable.
DROP POLICY IF EXISTS "Public read seo-og-images" ON storage.objects;

CREATE POLICY "Admins list seo-og-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'seo-og-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);