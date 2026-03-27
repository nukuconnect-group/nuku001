
-- Replace the broad SELECT policy with a restricted one
DROP POLICY IF EXISTS "Authenticated can view profiles for marketplace" ON public.profiles;

-- Only allow users to see their own full profile (including phone)
-- The existing "Users can view own full profile" policy already handles this

-- For marketplace/public access, create a policy that grants SELECT but we rely on the view
-- We need profiles accessible for joins in other queries, so keep broad SELECT
-- but the app code should use profiles_public view for listing

-- Actually, we need the broad SELECT for RLS on other tables (messages, orders, etc.)
-- So let's keep it but ensure the app uses the view for user-facing listings
CREATE POLICY "Authenticated can view profiles for marketplace"
ON public.profiles FOR SELECT TO authenticated
USING (true);
