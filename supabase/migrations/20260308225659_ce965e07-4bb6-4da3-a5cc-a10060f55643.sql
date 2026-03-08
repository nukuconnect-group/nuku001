
-- Trigger function to notify users when they receive a new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv RECORD;
  recipient_profile_id uuid;
  recipient_user_id uuid;
  sender_name TEXT;
  product_name TEXT;
BEGIN
  -- Get conversation details
  SELECT buyer_id, seller_id, product_id INTO conv
  FROM public.conversations WHERE id = NEW.conversation_id;

  -- Determine recipient (the other participant)
  IF NEW.sender_id = conv.buyer_id THEN
    recipient_profile_id := conv.seller_id;
  ELSE
    recipient_profile_id := conv.buyer_id;
  END IF;

  -- Get recipient user_id
  SELECT user_id INTO recipient_user_id FROM public.profiles WHERE id = recipient_profile_id;

  -- Get sender name
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  -- Get product name if applicable
  IF conv.product_id IS NOT NULL THEN
    SELECT name INTO product_name FROM public.products WHERE id = conv.product_id;
  END IF;

  -- Insert notification for recipient
  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (
    recipient_user_id,
    'message',
    'Nouveau message de ' || COALESCE(sender_name, 'un utilisateur'),
    CASE 
      WHEN product_name IS NOT NULL THEN 'À propos de "' || product_name || '": ' || LEFT(NEW.content, 100)
      ELSE LEFT(NEW.content, 100)
    END
  );

  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Also allow system/trigger inserts for notifications (the trigger runs as SECURITY DEFINER so this is fine)
