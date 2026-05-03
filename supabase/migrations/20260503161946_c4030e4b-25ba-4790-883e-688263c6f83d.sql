
-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  applicable_categories TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL DEFAULT '',
  target_segment TEXT NOT NULL DEFAULT 'all' CHECK (target_segment IN ('all', 'buyers', 'producers', 'drivers', 'trainers', 'learners')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ DEFAULT NULL,
  sent_at TIMESTAMPTZ DEFAULT NULL,
  recipients_count INTEGER DEFAULT 0,
  opens_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns"
  ON public.marketing_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Marketing email templates
CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'promo' CHECK (category IN ('promo', 'newsletter', 'relance', 'bienvenue', 'saisonnier')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing templates"
  ON public.marketing_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default marketing templates
INSERT INTO public.marketing_templates (name, subject, html_content, category) VALUES
('Bienvenue Premium', '🎉 Bienvenue dans la famille NukuConnect !', '<h1>Bienvenue !</h1><p>Merci de rejoindre NukuConnect, votre marketplace agricole intelligente.</p><p>Découvrez nos produits frais et certifiés dès maintenant.</p>', 'bienvenue'),
('Promo Flash', '⚡ Offre Flash — Réductions exceptionnelles !', '<h1>Offre Flash !</h1><p>Profitez de réductions incroyables sur une sélection de produits frais.</p><p>Code promo : <strong>{{CODE}}</strong></p><p>Offre limitée, ne ratez pas cette occasion !</p>', 'promo'),
('Newsletter Hebdo', '🌿 Les nouveautés de la semaine sur NukuConnect', '<h1>Nouveautés de la semaine</h1><p>Découvrez les derniers produits ajoutés par nos producteurs vérifiés.</p><p>Des fruits frais, des légumes bio et bien plus encore...</p>', 'newsletter'),
('Relance Panier', '🛒 Votre panier vous attend !', '<h1>N''oubliez pas votre panier</h1><p>Vous avez laissé des articles dans votre panier. Finalisez votre commande avant qu''ils ne soient plus disponibles.</p>', 'relance'),
('Saison des récoltes', '🌾 La saison des récoltes est arrivée !', '<h1>Saison des récoltes</h1><p>Les meilleurs produits de saison sont disponibles. Commandez directement auprès de nos producteurs locaux.</p>', 'saisonnier');
