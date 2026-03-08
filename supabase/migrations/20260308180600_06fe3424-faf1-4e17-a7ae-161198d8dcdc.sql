
-- Fix security definer view - set to INVOKER instead
ALTER VIEW public.public_profiles SET (security_invoker = on);
