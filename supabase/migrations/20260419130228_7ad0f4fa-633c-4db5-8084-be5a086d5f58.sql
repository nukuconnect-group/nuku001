-- 1. Profils : champs entreprise style Alibaba
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS years_active integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_rate integer DEFAULT 95;

-- 2. Token packs : ajout features + commission_rate
ALTER TABLE public.token_packs
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'starter';

-- 3. Reset & insert packs définitifs
UPDATE public.token_packs SET is_active = false;

INSERT INTO public.token_packs (code, name, price_fcfa, tokens, bonus_tokens, is_popular, description, sort_order, is_active, tier, commission_rate, features)
VALUES
  ('starter', 'Starter', 2500, 4, 0, false,
   'Idéal pour tester la plateforme', 1, true, 'starter', 0.08,
   '["4 boosts produits", "Commission ventes 8%", "Support standard"]'::jsonb),
  ('standard', 'Standard', 5000, 8, 0, true,
   'Le plus populaire — accès aux fonctionnalités premium', 2, true, 'standard', 0.08,
   '["8 boosts produits dans l''année", "Module Traçabilité activé", "Badge Vérifié animé", "Accès NukuAI illimité", "Commission ventes 8%", "Support prioritaire"]'::jsonb),
  ('premium', 'Premium', 10000, 20, 0, false,
   'Pour les pros — tout débloqué + API & analytics', 3, true, 'premium', 0.05,
   '["20 boosts produits", "Tout Standard inclus", "API d''intégration", "Dashboard analytics avancées", "Commission ventes réduite 5%", "Compte Manager dédié", "Mises en avant homepage"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_fcfa = EXCLUDED.price_fcfa,
  tokens = EXCLUDED.tokens,
  bonus_tokens = EXCLUDED.bonus_tokens,
  is_popular = EXCLUDED.is_popular,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  tier = EXCLUDED.tier,
  commission_rate = EXCLUDED.commission_rate,
  features = EXCLUDED.features,
  updated_at = now();

-- 4. Subscription : ajout commission_rate
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.08;

-- Migrer les anciens plans pro/business → standard/premium
UPDATE public.subscriptions SET plan = 'standard', commission_rate = 0.08 WHERE plan = 'pro';
UPDATE public.subscriptions SET plan = 'premium', commission_rate = 0.05 WHERE plan = 'business';
UPDATE public.subscriptions SET commission_rate = 0.08 WHERE plan IN ('free', 'starter', 'standard');
UPDATE public.subscriptions SET commission_rate = 0.05 WHERE plan = 'premium';

-- 5. Fonction commission mise à jour
CREATE OR REPLACE FUNCTION public.handle_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  seller_user_id uuid;
  buyer_name text;
  seller_plan text;
  commission_rate numeric;
  commission_amount numeric;
  net_amount numeric;
BEGIN
  SELECT p.*, pr.user_id as seller_uid, pr.full_name as seller_name
  INTO product_record
  FROM public.products p
  JOIN public.profiles pr ON pr.id = p.producer_id
  WHERE p.id = NEW.product_id;

  IF product_record IS NULL THEN RETURN NEW; END IF;
  seller_user_id := product_record.seller_uid;

  UPDATE public.products
  SET quantity_available = GREATEST(quantity_available - NEW.quantity, 0),
      stock_status = CASE 
        WHEN GREATEST(quantity_available - NEW.quantity, 0) = 0 THEN 'out_of_stock'
        WHEN GREATEST(quantity_available - NEW.quantity, 0) < 5 THEN 'low_stock'
        ELSE stock_status
      END
  WHERE id = NEW.product_id;

  SELECT s.plan INTO seller_plan
  FROM public.subscriptions s
  WHERE s.user_id = seller_user_id AND s.status = 'active'
  LIMIT 1;

  -- Nouveau mapping : free/starter/standard = 8%, premium = 5%
  CASE COALESCE(seller_plan, 'free')
    WHEN 'premium' THEN commission_rate := 0.05;
    ELSE commission_rate := 0.08;
  END CASE;

  commission_amount := ROUND(NEW.total_price * commission_rate);
  net_amount := NEW.total_price - commission_amount;

  SELECT full_name INTO buyer_name FROM public.profiles WHERE id = NEW.buyer_id;

  INSERT INTO public.notifications (user_id, type, title, description, product_id)
  VALUES (
    seller_user_id,
    'order',
    '💰 Nouvelle vente !',
    COALESCE(buyer_name, 'Un acheteur') || ' a acheté ' || NEW.quantity || ' ' || product_record.unit || ' de "' || product_record.name || '". Montant: ' || NEW.total_price || ' FCFA. Commission NukuConnect (' || (commission_rate * 100)::int || '% - plan ' || COALESCE(seller_plan, 'free') || '): ' || commission_amount || ' FCFA. Votre gain net: ' || net_amount || ' FCFA.',
    NEW.product_id
  );

  RETURN NEW;
END;
$function$;