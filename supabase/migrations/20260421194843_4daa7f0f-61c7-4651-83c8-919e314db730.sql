
-- 1) Ajouter beaucoup plus de catégories agricoles
INSERT INTO public.categories (name, emoji, sort_order, is_active) VALUES
  ('Apiculture (Miel)', '🐝', 13, true),
  ('Cultures vivrières', '🌽', 14, true),
  ('Cultures de rente (cacao, café, coton)', '☕', 15, true),
  ('Plantes médicinales & aromatiques', '🌿', 16, true),
  ('Champignons', '🍄', 17, true),
  ('Produits laitiers', '🥛', 18, true),
  ('Œufs', '🥚', 19, true),
  ('Viande & Charcuterie', '🥩', 20, true),
  ('Poissons & Fruits de mer', '🐠', 21, true),
  ('Engrais & Amendements', '🧪', 22, true),
  ('Semences & Plants', '🌱', 23, true),
  ('Pesticides & Bio-protection', '🧴', 24, true),
  ('Matériel & Outillage agricole', '🔧', 25, true),
  ('Tracteurs & Équipements lourds', '🚜', 26, true),
  ('Irrigation & Hydraulique', '💧', 27, true),
  ('Serres & Installations', '🏠', 28, true),
  ('Aliments pour bétail', '🌾', 29, true),
  ('Aliments pour volaille', '🐓', 30, true),
  ('Aliments pour poissons', '🐟', 31, true),
  ('Produits transformés', '🥫', 32, true),
  ('Huiles végétales', '🫒', 33, true),
  ('Céréales transformées (farine, semoule)', '🍞', 34, true),
  ('Produits bio certifiés', '🌍', 35, true),
  ('Emballages alimentaires', '📦', 36, true),
  ('Stockage & Silos', '🏭', 37, true),
  ('Logistique agricole', '🚛', 38, true),
  ('Services agricoles & conseil', '👨‍🌾', 39, true),
  ('Formation & Coaching', '📚', 40, true)
ON CONFLICT DO NOTHING;

-- 2) Suivi des renouvellements du plan gratuit (1 mois + 2 renouvellements)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS free_renewals_used INTEGER NOT NULL DEFAULT 0;

-- 3) Politique RLS : autoriser admins à modifier tout produit
DROP POLICY IF EXISTS "Admins can update any product" ON public.products;
CREATE POLICY "Admins can update any product"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Trigger pour notifier nouveau message (créer le trigger qui lie la fonction existante)
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
