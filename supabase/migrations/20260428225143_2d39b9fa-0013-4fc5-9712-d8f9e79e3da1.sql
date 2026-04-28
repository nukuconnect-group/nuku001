-- Add image_url column to categories
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create public bucket for category images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- RLS policies for category-images bucket
DROP POLICY IF EXISTS "Category images are publicly accessible" ON storage.objects;
CREATE POLICY "Category images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

DROP POLICY IF EXISTS "Admins can upload category images" ON storage.objects;
CREATE POLICY "Admins can upload category images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update category images" ON storage.objects;
CREATE POLICY "Admins can update category images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete category images" ON storage.objects;
CREATE POLICY "Admins can delete category images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'::app_role));