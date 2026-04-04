
-- Add slug column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create slug generation function
CREATE OR REPLACE FUNCTION public.generate_product_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name and location
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          unaccent(coalesce(NEW.name, '') || ' ' || coalesce(NEW.location, '')),
          '[^a-z0-9\s-]', '', 'gi'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);
  
  -- If empty, use id
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := NEW.id::text;
  END IF;
  
  final_slug := base_slug;
  
  -- Handle duplicates
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug AND id != NEW.id) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_generate_product_slug ON public.products;
CREATE TRIGGER trg_generate_product_slug
  BEFORE INSERT OR UPDATE OF name, location ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_product_slug();

-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Backfill existing products
UPDATE public.products SET name = name WHERE slug IS NULL;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
