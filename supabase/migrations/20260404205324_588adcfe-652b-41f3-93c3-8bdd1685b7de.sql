
-- Step 1: Add slug column
ALTER TABLE public.formations ADD COLUMN slug TEXT;

-- Step 2: Create function
CREATE OR REPLACE FUNCTION public.generate_formation_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          unaccent(coalesce(NEW.title, '')),
          '[^a-z0-9\s-]', '', 'gi'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := NEW.id::text;
  END IF;
  final_slug := base_slug;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.formations WHERE slug = final_slug AND id != NEW.id) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger
DROP TRIGGER IF EXISTS trg_generate_formation_slug ON public.formations;
CREATE TRIGGER trg_generate_formation_slug
  BEFORE INSERT OR UPDATE OF title ON public.formations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_formation_slug();

-- Step 4: Backfill existing formations
UPDATE public.formations SET title = title WHERE slug IS NULL;

-- Step 5: Unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_formations_slug ON public.formations(slug);

-- Step 6: Security - formation_modules
DROP POLICY IF EXISTS "Anyone can view modules" ON public.formation_modules;
DROP POLICY IF EXISTS "Authenticated can view modules" ON public.formation_modules;
CREATE POLICY "Authenticated can view modules"
ON public.formation_modules FOR SELECT TO authenticated
USING (true);

-- Step 7: Security - storage upload scoping
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
