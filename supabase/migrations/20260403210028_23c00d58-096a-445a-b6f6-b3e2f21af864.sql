
-- Replace notify_new_product to only notify followers instead of all buyers
CREATE OR REPLACE FUNCTION public.notify_new_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  producer_name TEXT;
  producer_profile_id UUID;
  follower RECORD;
BEGIN
  -- Get producer profile info
  SELECT full_name, id INTO producer_name, producer_profile_id 
  FROM public.profiles WHERE id = NEW.producer_id;
  
  -- Notify all followers of this producer
  FOR follower IN 
    SELECT p.user_id 
    FROM public.follows f
    JOIN public.profiles p ON p.id = f.follower_id
    WHERE f.following_id = producer_profile_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, description, product_id)
    VALUES (
      follower.user_id,
      'product',
      '📦 Nouveau produit de ' || COALESCE(producer_name, 'un fournisseur'),
      COALESCE(producer_name, 'Un fournisseur') || ' que vous suivez a publié "' || NEW.name || '"',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Make sure trigger exists on products table
DROP TRIGGER IF EXISTS on_new_product ON public.products;
CREATE TRIGGER on_new_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_product();
