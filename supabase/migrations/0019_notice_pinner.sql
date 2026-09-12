alter table public.notices
add column pinned_by uuid
  references public.profiles(id)
  on delete set null;
