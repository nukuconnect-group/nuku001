
-- ========================================
-- 1. CHAT-ATTACHMENTS: passer en privé + restreindre lecture aux participants
-- ========================================
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;

-- Lecture: uniquement participants de la conversation OU propriétaire du fichier
CREATE POLICY "Chat attachments readable by participants"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.profiles p ON (p.id = c.buyer_id OR p.id = c.seller_id)
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(objects.name))[2] = c.id::text
    )
  )
);

-- ========================================
-- 2. PRODUCT-IMAGES: dédupliquer policies + lecture publique stricte
-- ========================================
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own folder files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to product-images" ON storage.objects;

-- Lecture publique des images produits (affichage marketplace)
CREATE POLICY "Product images publicly readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Users upload own product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- ========================================
-- 3. Limites de taille et types MIME
-- ========================================
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'product-images';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
WHERE id = 'chat-attachments';

UPDATE storage.buckets
SET file_size_limit = 15728640, -- 15 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf']
WHERE id = 'driver-kyc';

UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'seo-og-images';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
WHERE id = 'email-assets';

UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp','video/mp4']
WHERE id = 'formation-documents';
