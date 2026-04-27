
CREATE OR REPLACE FUNCTION public.get_public_profile_data(p_profile_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select json_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'full_name', p.full_name,
    'business_name', p.business_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'location', p.location,
    'user_type', p.user_type,
    'is_verified', p.is_verified,
    'cover_url', p.cover_url,
    'cover_images', p.cover_images,
    'created_at', p.created_at,
    'response_rate', p.response_rate,
    'years_active', p.years_active,
    'kyc_status', (
      select s.status from public.supplier_kyc_submissions s
      where s.user_id = p.user_id
      order by s.created_at desc
      limit 1
    )
  )
  from public.profiles p
  where p.id = p_profile_id;
$function$;
