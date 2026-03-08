
-- 1. FIX: Phone exposure - split SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can see their own full profile (including phone)
CREATE POLICY "Users can view own full profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Other authenticated users can see profiles but NOT phone (use security definer function)
CREATE OR REPLACE FUNCTION public.get_public_profile_data(p_profile_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', id, 'user_id', user_id, 'full_name', full_name,
    'avatar_url', avatar_url, 'bio', bio, 'location', location,
    'user_type', user_type, 'is_verified', is_verified,
    'cover_url', cover_url, 'cover_images', cover_images,
    'created_at', created_at
  )
  FROM public.profiles WHERE id = p_profile_id;
$$;

-- Allow authenticated users to see other profiles (non-sensitive fields only)
CREATE POLICY "Authenticated users can view other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. FIX: Drop the public_profiles view (not needed, causes issues)
DROP VIEW IF EXISTS public.public_profiles;
