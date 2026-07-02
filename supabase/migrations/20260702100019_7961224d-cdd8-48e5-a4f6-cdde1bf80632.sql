
CREATE OR REPLACE FUNCTION public.can_signal_call(target_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    target_uid IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      target_uid = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.conversations c
        JOIN public.profiles pme   ON pme.user_id   = auth.uid()
        JOIN public.profiles pthem ON pthem.user_id = target_uid
        WHERE (c.buyer_id  = pme.id AND c.seller_id = pthem.id)
           OR (c.seller_id = pme.id AND c.buyer_id  = pthem.id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.deliveries d
        JOIN public.orders o ON o.id = d.order_id
        LEFT JOIN public.driver_profiles dp ON dp.id = d.driver_id
        LEFT JOIN public.profiles pb ON pb.id = o.buyer_id
        LEFT JOIN public.profiles ps ON ps.id = o.seller_id
        JOIN public.profiles pme   ON pme.user_id   = auth.uid()
        JOIN public.profiles pthem ON pthem.user_id = target_uid
        WHERE
          -- buyer <-> driver
          (pb.id = pme.id   AND dp.user_id = pthem.user_id) OR
          (dp.user_id = pme.user_id AND pb.id = pthem.id)   OR
          -- seller <-> driver
          (ps.id = pme.id   AND dp.user_id = pthem.user_id) OR
          (dp.user_id = pme.user_id AND ps.id = pthem.id)
      )
    )
$function$;

CREATE POLICY "Paid students can read formation documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'formation-documents'
  AND EXISTS (
    SELECT 1
    FROM public.formation_payments fp
    WHERE fp.user_id = auth.uid()
      AND (storage.foldername(objects.name))[1] = fp.formation_id::text
      AND (
        fp.status IN ('completed', 'paid', 'success')
        OR fp.paygate_status IN ('completed', 'paid', 'success')
      )
  )
);
