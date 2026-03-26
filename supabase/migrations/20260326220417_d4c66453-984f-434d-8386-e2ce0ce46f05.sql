
-- Formations system tables
CREATE TABLE public.formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructor text NOT NULL,
  image_url text,
  duration_minutes integer DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  level text NOT NULL DEFAULT 'beginner',
  is_paid boolean DEFAULT false,
  price numeric DEFAULT 0,
  modules_count integer DEFAULT 0,
  students_count integer DEFAULT 0,
  rating numeric DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.formation_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id uuid REFERENCES public.formations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'video',
  content_url text,
  duration_minutes integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.formation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  formation_id uuid REFERENCES public.formations(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.formation_modules(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  progress_percent integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, formation_id, module_id)
);

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  formation_id uuid REFERENCES public.formations(id) ON DELETE CASCADE NOT NULL,
  certificate_number text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, formation_id)
);

-- RLS
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formation_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Formations: public read
CREATE POLICY "Anyone can view published formations" ON public.formations FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage formations" ON public.formations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Modules: public read
CREATE POLICY "Anyone can view modules" ON public.formation_modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON public.formation_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Progress: user owns
CREATE POLICY "Users can view own progress" ON public.formation_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own progress" ON public.formation_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.formation_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Certificates: user owns + public view
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert certificates" ON public.certificates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Seed some formations
INSERT INTO public.formations (title, description, instructor, image_url, duration_minutes, category, level, is_paid, price, modules_count, students_count, rating) VALUES
('Agriculture Biologique: Les Bases', 'Apprenez les fondamentaux de l''agriculture biologique et les techniques de culture sans pesticides.', 'Dr. Kofi Mensah', 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400', 270, 'Agriculture Bio', 'beginner', false, 0, 8, 1250, 4.8),
('Élevage Avicole Moderne', 'Techniques modernes d''élevage de volailles pour maximiser la production.', 'Essi Amouzou', 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400', 375, 'Élevage', 'intermediate', true, 15000, 12, 890, 4.7),
('Gestion des Maladies des Cultures', 'Identifiez et traitez les maladies courantes des cultures tropicales.', 'Dr. Ama Koffi', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', 300, 'Protection des cultures', 'intermediate', false, 0, 10, 2100, 4.9),
('Commerce Agricole et Marketing', 'Apprenez à vendre vos produits efficacement.', 'Akossiwa Dosseh', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 240, 'Business', 'advanced', true, 20000, 8, 1560, 4.8),
('Culture du Riz: Du Semis à la Récolte', 'Guide complet pour la riziculture dans les zones tropicales.', 'Komlan Assou', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 450, 'Céréales', 'beginner', false, 0, 14, 980, 4.7);
