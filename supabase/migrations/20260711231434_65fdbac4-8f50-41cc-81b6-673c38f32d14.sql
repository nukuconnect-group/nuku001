CREATE OR REPLACE FUNCTION public.admin_republish_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_reason text DEFAULT 'Republié par l''administrateur après correction'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_product record;
  v_owner record;
  v_attempt integer;
  v_approved_at timestamptz := now();
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF v_product IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF length(trim(coalesce(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'invalid_product_name';
  END IF;

  SELECT user_id, full_name INTO v_owner FROM public.profiles WHERE id = v_product.producer_id;

  SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt
  FROM public.moderation_logs WHERE product_id = p_product_id;

  -- FIX: la colonne "status" n'existe pas sur products, on utilise uniquement moderation_status
  UPDATE public.products
  SET name = trim(p_name),
      description = coalesce(p_description, ''),
      moderation_status = 'approved',
      moderation_reason = NULL,
      moderated_at = v_approved_at,
      moderation_scheduled_at = NULL,
      updated_at = v_approved_at
  WHERE id = p_product_id;

  INSERT INTO public.moderation_logs (
    product_id,
    attempt_number,
    decision,
    reason,
    confidence,
    raw_response,
    prompt_summary
  ) VALUES (
    p_product_id,
    v_attempt,
    'approved',
    coalesce(p_reason, 'Republié par l''administrateur après correction'),
    1,
    jsonb_build_object(
      'action', 'admin_republish',
      'admin_id', v_admin,
      'approved_at', v_approved_at,
      'old_content', jsonb_build_object(
        'name', v_product.name,
        'description', v_product.description,
        'moderation_status', v_product.moderation_status,
        'moderation_reason', v_product.moderation_reason
      ),
      'new_content', jsonb_build_object(
        'name', trim(p_name),
        'description', coalesce(p_description, ''),
        'moderation_status', 'approved'
      )
    ),
    'Admin override: ancien et nouveau contenu enregistrés avant republication'
  );

  IF v_owner.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, description, product_id)
    VALUES (
      v_owner.user_id,
      'product',
      '✅ Produit republié par l''admin',
      'Votre produit "' || trim(p_name) || '" a été corrigé et approuvé. Il est maintenant visible sur la marketplace.',
      p_product_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'owner_user_id', v_owner.user_id,
    'owner_name', v_owner.full_name,
    'approved_at', v_approved_at,
    'attempt_number', v_attempt
  );
END;
$$;