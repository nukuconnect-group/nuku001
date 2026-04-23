CREATE OR REPLACE FUNCTION public.clear_conversation_messages(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_participant boolean;
  v_deleted_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON p.id = c.buyer_id OR p.id = c.seller_id
    WHERE c.id = p_conversation_id
      AND p.user_id = auth.uid()
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.messages
  WHERE conversation_id = p_conversation_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_conversation_thread(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_participant boolean;
  v_deleted_messages integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON p.id = c.buyer_id OR p.id = c.seller_id
    WHERE c.id = p_conversation_id
      AND p.user_id = auth.uid()
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.messages
  WHERE conversation_id = p_conversation_id;

  GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

  DELETE FROM public.conversations
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true, 'deleted_messages', v_deleted_messages);
END;
$$;

DROP TRIGGER IF EXISTS notify_new_message_trigger ON public.messages;
CREATE TRIGGER notify_new_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

DROP TRIGGER IF EXISTS schedule_product_moderation_trigger ON public.products;
CREATE TRIGGER schedule_product_moderation_trigger
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.schedule_product_moderation();

DROP TRIGGER IF EXISTS notify_product_moderation_change_trigger ON public.products;
CREATE TRIGGER notify_product_moderation_change_trigger
AFTER UPDATE OF moderation_status ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_product_moderation_change();

DROP TRIGGER IF EXISTS notify_new_product_trigger ON public.products;
CREATE TRIGGER notify_new_product_trigger
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_product();