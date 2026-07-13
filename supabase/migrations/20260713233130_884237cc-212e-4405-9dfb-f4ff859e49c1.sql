
-- 1) Backfill missing profiles for existing users
INSERT INTO public.profiles (user_id, full_name, user_type)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
       COALESCE(u.raw_user_meta_data->>'user_type', 'buyer')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- 2) ensure_my_profile RPC: returns profile.id, creates row if missing
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_email text;
  v_full text;
  v_type text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO v_id FROM public.profiles WHERE user_id = v_uid;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT email,
         COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
         COALESCE(raw_user_meta_data->>'user_type', 'buyer')
    INTO v_email, v_full, v_type
  FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (v_uid, v_full, v_type)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- 3) Add deadline column to demands (optional)
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS deadline timestamptz;
