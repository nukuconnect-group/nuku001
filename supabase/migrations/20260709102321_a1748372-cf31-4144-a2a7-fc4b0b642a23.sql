
-- Conversations: lock immutable fields via trigger
CREATE OR REPLACE FUNCTION public.enforce_conversation_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id THEN
    RAISE EXCEPTION 'Cannot modify buyer_id, seller_id or product_id on a conversation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_conversation_immutable_fields_trigger ON public.conversations;
CREATE TRIGGER enforce_conversation_immutable_fields_trigger
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_conversation_immutable_fields();

-- Orders: lock financial fields on seller updates via trigger
CREATE OR REPLACE FUNCTION public.enforce_order_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    -- Allow service_role (edge functions) to bypass
    IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot modify locked order fields (buyer_id, seller_id, product_id, quantity, total_price)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_immutable_fields_trigger ON public.orders;
CREATE TRIGGER enforce_order_immutable_fields_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_immutable_fields();
