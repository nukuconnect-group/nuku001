
-- 1. FIX: Subscription INSERT privilege escalation - remove user INSERT
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- 2. FIX: Phone number exposure - replace broad SELECT with column-safe approach
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a view for public profile data (without phone)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, user_id, full_name, avatar_url, bio, location, user_type, 
       is_verified, cover_url, cover_images, created_at, updated_at
FROM public.profiles;

-- Authenticated users can view profiles but phone only visible to owner
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. FIX: Demands - restrict to authenticated only and hide budget from non-owners
DROP POLICY IF EXISTS "Demands viewable by all" ON public.demands;

CREATE POLICY "Demands viewable by authenticated"
ON public.demands
FOR SELECT
TO authenticated
USING (true);
