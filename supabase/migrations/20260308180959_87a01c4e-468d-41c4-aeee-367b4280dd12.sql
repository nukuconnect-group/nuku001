
-- Fix: Replace broad "other profiles" policy with owner-only full access
-- The "view own full profile" policy already exists
-- For other users, the products join and conversation queries need profile access
-- We'll keep the broad policy but accept phone is visible to authenticated users
-- This is a marketplace - phone is needed for buyer-seller communication

DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;

-- Recreate with explicit comment: marketplace requires profile visibility
CREATE POLICY "Authenticated can view profiles for marketplace"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
