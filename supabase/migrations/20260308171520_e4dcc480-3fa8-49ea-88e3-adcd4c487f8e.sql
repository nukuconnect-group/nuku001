
-- Fix profiles RLS: Drop broken restrictive policies, create proper permissive ones
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous profile access" ON public.profiles;

-- Permissive: Authenticated users can view all profiles (needed for marketplace, conversations, etc.)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Permissive: Public can view basic profile info (for product pages)
CREATE POLICY "Public can view profiles"
ON public.profiles FOR SELECT
TO anon
USING (true);
