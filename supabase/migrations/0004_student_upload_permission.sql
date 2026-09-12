-- ============================================================
-- Student Upload Permission Management
-- ============================================================

create or replace function public.set_student_upload_disabled(
  p_student_id uuid,
  p_upload_disabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_student public.profiles%rowtype;
  v_previous_state jsonb;
  v_new_state jsonb;
begin
  select *
  into v_student
  from public.profiles
  where id = p_student_id
    and role = 'student'
  for update;

  if not found then
    raise exception 'Student account could not be found.';
  end if;

  if not public.can_manage_upload_permission(v_student.department_id) then
    raise exception
      'You are not authorized to manage this student''s upload permission.';
  end if;

  if v_student.upload_disabled = p_upload_disabled then
    return;
  end if;

  v_previous_state := jsonb_build_object(
    'upload_disabled',
    v_student.upload_disabled
  );

  update public.profiles
  set
    upload_disabled = p_upload_disabled,
    updated_at = now()
  where id = p_student_id;

  v_new_state := jsonb_build_object(
    'upload_disabled',
    p_upload_disabled
  );

  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    previous_state,
    new_state
  )
  values (
    auth.uid(),
    case
      when p_upload_disabled
        then 'disable_student_upload_permission'
      else 'enable_student_upload_permission'
    end,
    'profiles',
    p_student_id,
    v_previous_state,
    v_new_state
  );
end;
$function$;

grant execute on function public.set_student_upload_disabled(uuid, boolean)
to authenticated;
