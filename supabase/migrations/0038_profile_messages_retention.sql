-- Profile message retention and rolling exchange limit.
-- Active messages are limited to 30 days.
-- Existing limits remain:
--   5 messages per sender in one direction
--   10 messages total per conversation

create or replace function public.enforce_profile_message_exchange_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  sender_message_count integer;
  conversation_message_count integer;
  retention_cutoff timestamptz;
begin
  retention_cutoff := now() - interval '30 days';

  select count(*)
  into sender_message_count
  from public.profile_messages
  where sender_id = new.sender_id
    and recipient_id = new.recipient_id
    and created_at >= retention_cutoff;

  if sender_message_count >= 5 then
    raise exception 'SENDER_MESSAGE_LIMIT_REACHED';
  end if;

  select count(*)
  into conversation_message_count
  from public.profile_messages
  where created_at >= retention_cutoff
    and (
      (
        sender_id = new.sender_id
        and recipient_id = new.recipient_id
      )
      or (
        sender_id = new.recipient_id
        and recipient_id = new.sender_id
      )
    );

  if conversation_message_count >= 10 then
    raise exception 'CONVERSATION_MESSAGE_LIMIT_REACHED';
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_profile_message_exchange_limit() from public;
revoke all on function public.enforce_profile_message_exchange_limit() from authenticated;
grant execute on function public.enforce_profile_message_exchange_limit() to service_role;

drop trigger if exists profile_messages_exchange_limit_trigger
on public.profile_messages;

create trigger profile_messages_exchange_limit_trigger
before insert on public.profile_messages
for each row
execute function public.enforce_profile_message_exchange_limit();

create or replace function public.cleanup_expired_profile_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  deleted_count integer;
begin
  delete from public.profile_messages
  where created_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$function$;

revoke all on function public.cleanup_expired_profile_messages() from public;
revoke all on function public.cleanup_expired_profile_messages() from authenticated;
grant execute on function public.cleanup_expired_profile_messages() to service_role;







