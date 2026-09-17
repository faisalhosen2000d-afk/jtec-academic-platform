-- Enforce 5 messages per participant and 10 messages per conversation.
-- A conversation is identified by the unordered pair of sender_id and recipient_id.

create or replace function public.enforce_profile_message_exchange_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  sender_message_count integer;
  conversation_message_count integer;
begin
  select count(*)
  into sender_message_count
  from public.profile_messages
  where sender_id = new.sender_id
    and recipient_id = new.recipient_id;

  if sender_message_count >= 5 then
    raise exception 'SENDER_MESSAGE_LIMIT_REACHED';
  end if;

  select count(*)
  into conversation_message_count
  from public.profile_messages
  where (
    sender_id = new.sender_id
    and recipient_id = new.recipient_id
  )
  or (
    sender_id = new.recipient_id
    and recipient_id = new.sender_id
  );

  if conversation_message_count >= 10 then
    raise exception 'CONVERSATION_MESSAGE_LIMIT_REACHED';
  end if;

  return new;
end;
$function$;

drop trigger if exists profile_messages_exchange_limit_trigger
on public.profile_messages;

create trigger profile_messages_exchange_limit_trigger
before insert on public.profile_messages
for each row
execute function public.enforce_profile_message_exchange_limit();