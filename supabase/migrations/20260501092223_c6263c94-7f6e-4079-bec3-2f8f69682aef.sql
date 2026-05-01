CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_delivery_share_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  IF NEW.delivery_otp IS NULL THEN
    NEW.delivery_otp := lpad((floor(random() * 1000000))::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;