-- Add per-message read state for student conversations.

alter table public.profile_messages
add column if not exists read_at timestamptz;