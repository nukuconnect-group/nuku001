
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS emoji text DEFAULT '📦';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS subcategories text[] DEFAULT '{}';
