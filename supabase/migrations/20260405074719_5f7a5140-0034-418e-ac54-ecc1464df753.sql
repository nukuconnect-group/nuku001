
-- Fix storage: drop existing policies and recreate
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;

CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Fix deliveries INSERT
DROP POLICY IF EXISTS "Buyers and sellers can insert deliveries for own orders" ON public.deliveries;

CREATE POLICY "Buyers and sellers can insert deliveries for own orders"
ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (
  order_id IN (
    SELECT o.id
    FROM orders o
    JOIN profiles p ON (p.id = o.buyer_id OR p.id = o.seller_id)
    WHERE p.user_id = auth.uid()
  )
);
