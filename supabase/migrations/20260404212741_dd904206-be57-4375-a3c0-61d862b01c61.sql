
-- Fix 1: Restrict support_messages INSERT to authenticated role only
DROP POLICY IF EXISTS "Users can insert support messages" ON public.support_messages;
CREATE POLICY "Users can insert support messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix 2: Remove driver_profiles from Realtime to prevent GPS data leaks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'driver_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.driver_profiles;
  END IF;
END $$;
