-- Add unread state to the student conversations list.
-- This remains independent from the notifications system.

drop function if exists public.get_student_conversations();

create or replace function public.get_student_conversations()
returns table (
  partner_id uuid,
  latest_message text,
  latest_message_created_at timestamptz,
  unread_count bigint
)
language sql
security definer
stable
set search_path = public
as $function$
  with current_student as (
    select p.id
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and p.is_verified = true
  ),
  conversation_messages as (
    select
      case
        when pm.sender_id = auth.uid() then pm.recipient_id
        else pm.sender_id
      end as partner_id,
      pm.id,
      pm.message,
      pm.created_at,
      pm.read_at,
      pm.sender_id,
      pm.recipient_id
    from public.profile_messages pm
    where (
      pm.sender_id = auth.uid()
      or pm.recipient_id = auth.uid()
    )
      and pm.created_at >= now() - interval '30 days'
      and exists (
        select 1
        from current_student
      )
  ),
  latest_per_partner as (
    select distinct on (cm.partner_id)
      cm.partner_id,
      cm.message as latest_message,
      cm.created_at as latest_message_created_at
    from conversation_messages cm
    order by
      cm.partner_id,
      cm.created_at desc,
      cm.id desc
  ),
  unread_per_partner as (
    select
      cm.partner_id,
      count(*) as unread_count
    from conversation_messages cm
    where cm.recipient_id = auth.uid()
      and cm.read_at is null
    group by cm.partner_id
  )
  select
    lp.partner_id,
    lp.latest_message,
    lp.latest_message_created_at,
    coalesce(up.unread_count, 0) as unread_count
  from latest_per_partner lp
  left join unread_per_partner up
    on up.partner_id = lp.partner_id
  order by
    lp.latest_message_created_at desc,
    lp.partner_id;
$function$;

revoke all on function public.get_student_conversations() from public;
revoke all on function public.get_student_conversations() from authenticated;

grant execute on function public.get_student_conversations()
to authenticated;
