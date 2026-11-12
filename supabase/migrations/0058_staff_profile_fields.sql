-- Add optional faculty/staff profile columns to public.profiles
alter table public.profiles
  add column if not exists designation text,
  add column if not exists phone text,
  add column if not exists office_room text,
  add column if not exists specialization text;