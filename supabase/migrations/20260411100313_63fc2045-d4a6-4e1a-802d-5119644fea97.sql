-- 1. Add DELETE policy for driver-kyc storage bucket
CREATE POLICY "Users can delete own kyc files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'driver-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete any kyc files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'driver-kyc' AND public.has_role(auth.uid(), 'admin'));

-- 2. Add write-restriction policies for email-assets bucket
CREATE POLICY "Only service role can insert email assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "Only service role can update email assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'email-assets' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "Only service role can delete email assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'email-assets' AND auth.role() = 'service_role');

-- 3. Restrict reviews to authenticated users only
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

-- Check existing policies and create appropriate one
CREATE POLICY "Authenticated users can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);