
-- Create a private profile details table for sensitive data
CREATE TABLE public.profile_private (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- Only the owner can see/manage their private data
CREATE POLICY "Users can view own private profile"
ON public.profile_private FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private profile"
ON public.profile_private FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private profile"
ON public.profile_private FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Migrate existing phone data
INSERT INTO public.profile_private (user_id, phone)
SELECT user_id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Remove phone from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

-- Drop the old view if exists
DROP VIEW IF EXISTS public.profiles_public;
