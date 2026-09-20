alter table public.profile_messages
add column if not exists material_id uuid
references public.materials(id)
on delete set null;