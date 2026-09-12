-- JTEC Academic Platform
-- Phase M Notice Permission Authorization
-- Migration 0007

create or replace function public.can_publish_notices(
  p_department_id uuid default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $function$
  select
    public.is_super_admin()
    or (
      public.is_admin()
      and exists (
        select 1
        from public.staff_scopes
        where profile_id = auth.uid()
          and can_publish_notices = true
          and (
            department_id = p_department_id
            or department_id is null
          )
      )
    );
$function$;

grant execute on function public.can_publish_notices(uuid)
to authenticated;