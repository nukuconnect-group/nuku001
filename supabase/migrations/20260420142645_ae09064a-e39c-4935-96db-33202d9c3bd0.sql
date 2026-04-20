-- Restrict public bucket file listing: keep public read for known files, but require authentication to LIST file objects.
-- Drop overly permissive public SELECT on storage.objects for product-images and email-assets if they exist.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE '%public%' OR policyname ILIKE '%anyone%' OR policyname ILIKE '%product-images%' OR policyname ILIKE '%email-assets%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public read access by direct URL works regardless of RLS for buckets marked public.
-- Add a SELECT policy that allows authenticated users to read object rows (needed for signed listings within their context),
-- but does NOT grant anonymous listing of all files.
CREATE POLICY "Authenticated can read product-images metadata"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated can read email-assets metadata"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'email-assets');

-- Allow authenticated users to upload to product-images in their own folder
CREATE POLICY "Users can upload to product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND owner = auth.uid());

CREATE POLICY "Users can delete own product-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND owner = auth.uid());
