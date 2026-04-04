-- Add UPDATE policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own folder files' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own folder files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''product-images'' AND (auth.uid())::text = (storage.foldername(name))[1])';
  END IF;
END $$;