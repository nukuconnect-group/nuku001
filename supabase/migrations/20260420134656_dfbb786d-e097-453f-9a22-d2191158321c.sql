create or replace function public.get_public_profile_data(p_profile_id uuid)
returns json
language sql
stable
security definer
set search_path to 'public'
as $function$
  select json_build_object(
    'id', id,
    'user_id', user_id,
    'full_name', full_name,
    'business_name', business_name,
    'avatar_url', avatar_url,
    'bio', bio,
    'location', location,
    'user_type', user_type,
    'is_verified', is_verified,
    'cover_url', cover_url,
    'cover_images', cover_images,
    'created_at', created_at,
    'response_rate', response_rate,
    'years_active', years_active
  )
  from public.profiles
  where id = p_profile_id;
$function$;

drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
on public.messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = messages.sender_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Delivery participants can delete own messages" on public.delivery_messages;
create policy "Delivery participants can delete own messages"
on public.delivery_messages
for delete
to authenticated
using (
  sender_id = auth.uid()
  and delivery_id in (
    select d.id
    from public.deliveries d
    where d.driver_id in (
      select dp.id
      from public.driver_profiles dp
      where dp.user_id = auth.uid()
    )
    union
    select d.id
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    join public.profiles p on p.id = o.buyer_id
    where p.user_id = auth.uid()
  )
);