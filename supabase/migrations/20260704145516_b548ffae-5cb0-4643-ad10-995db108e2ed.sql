
CREATE OR REPLACE FUNCTION public.get_public_profile(_id_or_name text)
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE
    (
      -- UUID exact match
      (_id_or_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND p.id::text = _id_or_name)
      OR
      -- Business or full name (case-insensitive) match
      lower(coalesce(p.business_name, '')) = lower(_id_or_name)
      OR
      lower(coalesce(p.full_name, '')) = lower(_id_or_name)
    )
  ORDER BY p.is_verified DESC NULLS LAST, p.updated_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
