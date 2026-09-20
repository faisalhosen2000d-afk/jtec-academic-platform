-- Allow the service role to read and update message read state.
-- This is required by the conversation auto-read server action.

grant select, update
on table public.profile_messages
to service_role;