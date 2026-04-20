-- Update handle_new_subscription default to 5 products for free plan
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, max_products)
  VALUES (NEW.id, 'free', 5)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Update existing free subscriptions to allow 5 products
UPDATE public.subscriptions SET max_products = 5 WHERE plan = 'free' AND max_products < 5;