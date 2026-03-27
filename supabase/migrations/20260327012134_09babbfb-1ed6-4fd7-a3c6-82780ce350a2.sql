
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, user_type, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'buyer'),
    NEW.raw_user_meta_data->>'location'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    user_type = COALESCE(EXCLUDED.user_type, profiles.user_type),
    location = COALESCE(EXCLUDED.location, profiles.location);

  -- Save phone to private table
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL THEN
    INSERT INTO public.profile_private (user_id, phone)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'phone')
    ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;
  END IF;

  RETURN NEW;
END;
$$;
