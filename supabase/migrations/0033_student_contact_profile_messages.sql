-- Student contact profile and messaging
create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  phone text,
  whatsapp text,
  facebook text,
  instagram text,
  linkedin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_contacts enable row level security;

grant select, insert, update, delete
on table public.profile_contacts
to authenticated;

drop policy if exists "profile_contacts_select_own"
on public.profile_contacts;

create policy "profile_contacts_select_own"
on public.profile_contacts
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "profile_contacts_insert_own"
on public.profile_contacts;

create policy "profile_contacts_insert_own"
on public.profile_contacts
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "profile_contacts_update_own"
on public.profile_contacts;

create policy "profile_contacts_update_own"
on public.profile_contacts
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "profile_contacts_delete_own"
on public.profile_contacts;

create policy "profile_contacts_delete_own"
on public.profile_contacts
for delete
to authenticated
using (profile_id = auth.uid());


create table if not exists public.profile_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profile_messages enable row level security;

grant insert, select
on table public.profile_messages
to authenticated;

drop policy if exists "profile_messages_insert_sender"
on public.profile_messages;

create policy "profile_messages_insert_sender"
on public.profile_messages
for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "profile_messages_select_participant"
on public.profile_messages;

create policy "profile_messages_select_participant"
on public.profile_messages
for select
to authenticated
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
);


create or replace function public.get_public_contact_profile(
  p_profile_id uuid
)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  email text,
  phone text,
  whatsapp text,
  facebook text,
  instagram text,
  linkedin text
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
    c.linkedin
  from public.profiles p
  left join public.profile_contacts c
    on c.profile_id = p.id
  where p.id = p_profile_id
    and p.role = 'student';
$function$;

grant execute
on function public.get_public_contact_profile(uuid)
to authenticated;







