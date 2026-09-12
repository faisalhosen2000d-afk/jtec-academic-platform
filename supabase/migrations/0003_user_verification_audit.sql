-- ============================================================
-- JTEC Academic Platform
-- Phase: Student Verification Audit
-- ============================================================

-- Upgrade verify_student() so that student verification and
-- its audit record happen in the same database transaction.
-- Permission checks remain enforced by the existing
-- can_verify_students() function.

create or replace function public.verify_student(
  target_student_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.profiles%rowtype;
  v_previous_state jsonb;
  v_new_state jsonb;
begin

  -- Lock the target profile while it is being verified.
  select *
  into v_student
  from public.profiles
  where id = target_student_id
    and role = 'student'
  for update;

  if not found then
    raise exception 'Target user is not a student.';
  end if;

  -- Keep the existing permission model.
  if not public.can_verify_students(v_student.department_id) then
    raise exception 'Not authorized to verify this student.';
  end if;

  -- Do not perform a second verification.
  if v_student.is_verified then
    raise exception 'Student is already verified.';
  end if;

  -- Capture the state before the change.
  v_previous_state := jsonb_build_object(
    'id', v_student.id,
    'role', v_student.role,
    'full_name', v_student.full_name,
    'student_id', v_student.student_id,
    'email', v_student.email,
    'department_id', v_student.department_id,
    'batch_id', v_student.batch_id,
    'current_level_id', v_student.current_level_id,
    'current_term_id', v_student.current_term_id,
    'is_verified', v_student.is_verified,
    'upload_disabled', v_student.upload_disabled
  );

  -- Perform verification.
  update public.profiles
  set is_verified = true
  where id = target_student_id;

  -- Capture the state after the change.
  select *
  into v_student
  from public.profiles
  where id = target_student_id;

  v_new_state := jsonb_build_object(
    'id', v_student.id,
    'role', v_student.role,
    'full_name', v_student.full_name,
    'student_id', v_student.student_id,
    'email', v_student.email,
    'department_id', v_student.department_id,
    'batch_id', v_student.batch_id,
    'current_level_id', v_student.current_level_id,
    'current_term_id', v_student.current_term_id,
    'is_verified', v_student.is_verified,
    'upload_disabled', v_student.upload_disabled
  );

  -- Record the administrative action in the same transaction.
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
    'verify_student',
    'profiles',
    target_student_id,
    v_previous_state,
    v_new_state
  );

end;
$$;


grant execute on function public.verify_student(uuid)
to authenticated;