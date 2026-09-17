alter table public.profile_contacts
add column if not exists telegram text;

drop function if exists public.get_public_contact_profile(uuid);

create function public.get_public_contact_profile(p_profile_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  email text,
  phone text,
  whatsapp text,
  facebook text,
  instagram text,
  linkedin text,
  telegram text
)
language sql
security definer
stable
set search_path = public
as $function$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    c.email,
    c.phone,
    c.whatsapp,
    c.facebook,
    c.instagram,
    c.linkedin,
    c.telegram
  from public.profiles p
  left join public.profile_contacts c
    on c.profile_id = p.id
  where p.id = p_profile_id
    and p.role = 'student';
$function$;

grant execute on function public.get_public_contact_profile(uuid)
to authenticated;