-- KYC audit/journal log
CREATE TABLE IF NOT EXISTS public.kyc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_id uuid NOT NULL,
  kyc_type text NOT NULL CHECK (kyc_type IN ('driver','supplier')),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected','resent')),
  reason text,
  email_idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_user ON public.kyc_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_kyc ON public.kyc_audit_log(kyc_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_idem ON public.kyc_audit_log(email_idempotency_key);

ALTER TABLE public.kyc_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their KYC log"
  ON public.kyc_audit_log FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- No insert policy: writes happen via service role (Edge Function).

-- Realtime on email_send_log so admins get live updates when KYC email is sent
ALTER TABLE public.email_send_log REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='email_send_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.email_send_log';
  END IF;
END $$;

-- Buyer reminder: seller hasn't validated reception within 24h
CREATE OR REPLACE FUNCTION public.send_buyer_seller_validation_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  c integer := 0;
  buyer_uid uuid;
BEGIN
  FOR r IN
    SELECT o.id, o.buyer_id, o.delivery_method, p.name AS product_name, o.created_at
    FROM public.orders o
    JOIN public.products p ON p.id = o.product_id
    WHERE o.status IN ('pending','confirmed','paid')
      AND o.seller_confirmed_at IS NULL
      AND o.created_at <= now() - interval '24 hours'
      AND o.created_at >= now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = (SELECT user_id FROM public.profiles WHERE id = o.buyer_id)
          AND n.type = 'order_reminder'
          AND n.description LIKE '%' || o.id::text || '%'
          AND n.created_at >= now() - interval '24 hours'
      )
  LOOP
    SELECT user_id INTO buyer_uid FROM public.profiles WHERE id = r.buyer_id;
    IF buyer_uid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.notifications (user_id, type, title, description)
    VALUES (
      buyer_uid,
      'order_reminder',
      '⏳ Vendeur n''a pas encore validé',
      'Votre commande "' || r.product_name || '" (#' || LEFT(r.id::text,8) || ') attend la validation du vendeur depuis plus de 24h. Nous l''avons relancé.'
    );

    -- Also nudge the seller via their notifications
    INSERT INTO public.notifications (user_id, type, title, description)
    SELECT pr.user_id, 'order_reminder',
           '🔔 Validation en attente',
           'Veuillez confirmer la réception/préparation de la commande "' || r.product_name || '" (#' || LEFT(r.id::text,8) || ').'
    FROM public.orders o2
    JOIN public.profiles pr ON pr.id = o2.seller_id
    WHERE o2.id = r.id;

    c := c + 1;
  END LOOP;
  RETURN c;
END;
$$;

-- International shipment stage change notification
CREATE OR REPLACE FUNCTION public.notify_international_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_uid uuid;
BEGIN
  IF NEW.delivery_method = 'international'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT user_id INTO buyer_uid FROM public.profiles WHERE id = NEW.buyer_id;
    IF buyer_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, description)
      VALUES (
        buyer_uid,
        'international_shipment',
        '🌍 Expédition internationale: ' || NEW.status,
        'Votre commande #' || LEFT(NEW.id::text,8) || ' est maintenant au statut: ' || NEW.status || '. Notre équipe coordonne avec le partenaire logistique.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_intl_stage_change ON public.orders;
CREATE TRIGGER trg_intl_stage_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_international_stage_change();

-- Schedule reminder every hour
DO $$
DECLARE existing_jobid bigint;
BEGIN
  SELECT jobid INTO existing_jobid FROM cron.job WHERE jobname = 'buyer-seller-validation-reminders';
  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;
  PERFORM cron.schedule(
    'buyer-seller-validation-reminders',
    '0 * * * *',
    $cron$ SELECT public.send_buyer_seller_validation_reminders(); $cron$
  );
EXCEPTION WHEN undefined_table THEN
  -- pg_cron may not be available in this environment; ignore
  NULL;
END $$;