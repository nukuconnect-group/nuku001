
-- 1. Make driver-kyc bucket public so KYC images render in thumbnails and admin views
UPDATE storage.buckets SET public = true WHERE id = 'driver-kyc';

-- Ensure a public SELECT policy exists for the bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Public read driver-kyc'
  ) THEN
    CREATE POLICY "Public read driver-kyc"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'driver-kyc');
  END IF;
END $$;

-- 2. Backfill: any supplier with an approved KYC but profile not verified
UPDATE public.profiles p
SET is_verified = true
FROM public.supplier_kyc_submissions s
WHERE s.user_id = p.user_id
  AND s.status = 'approved'
  AND COALESCE(p.is_verified, false) = false;

-- 3. Trigger: auto-sync supplier verification on KYC status change
CREATE OR REPLACE FUNCTION public.sync_supplier_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET is_verified = true WHERE user_id = NEW.user_id;
  ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    -- Only revoke if no other approved KYC exists
    IF NOT EXISTS (
      SELECT 1 FROM public.supplier_kyc_submissions
      WHERE user_id = NEW.user_id AND status = 'approved' AND id <> NEW.id
    ) THEN
      UPDATE public.profiles SET is_verified = false WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_supplier_verification ON public.supplier_kyc_submissions;
CREATE TRIGGER trg_sync_supplier_verification
AFTER UPDATE OF status ON public.supplier_kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.sync_supplier_verification();

-- 4. Trigger: auto-approve driver profile on KYC approval
CREATE OR REPLACE FUNCTION public.sync_driver_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.driver_profiles SET is_approved = true WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_driver_approval ON public.driver_kyc_submissions;
CREATE TRIGGER trg_sync_driver_approval
AFTER UPDATE OF status ON public.driver_kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.sync_driver_approval();
