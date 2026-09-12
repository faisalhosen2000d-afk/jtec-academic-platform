-- JTEC Academic Platform
-- Phase M Notice Targeting
-- Migration 0008

alter table public.notices
drop constraint if exists notices_target_scope_check;

alter table public.notices
add constraint notices_targeting_consistency
check (
  (
    target_scope = 'all'
    and target_department_id is null
    and target_batch_id is null
    and target_level_id is null
    and target_term_id is null
  )
  or
  (
    target_scope = 'department'
    and target_department_id is not null
  )
);

drop policy if exists "notices_select_targeted"
  on public.notices;

create policy "notices_select_targeted"
  on public.notices
  for select
  to authenticated
  using (
    is_archived = false
    and (
      target_scope = 'all'
      or (
        target_scope = 'department'
        and target_department_id = (
          select p.department_id
          from public.profiles p
          where p.id = auth.uid()
        )
        and (
          target_batch_id is null
          or target_batch_id = (
            select p.batch_id
            from public.profiles p
            where p.id = auth.uid()
          )
        )
        and (
          target_level_id is null
          or target_level_id = (
            select p.current_level_id
            from public.profiles p
            where p.id = auth.uid()
          )
        )
        and (
          target_term_id is null
          or target_term_id = (
            select p.current_term_id
            from public.profiles p
            where p.id = auth.uid()
          )
        )
      )
    )
  );