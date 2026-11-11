-- ============================================================
-- JTEC Academic Platform Migration 0057
-- Phase 1: Student Verification System, Schema, and Storage
-- ============================================================

-- 1. Add verification columns to public.profiles
alter table public.profiles
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected', 'suspended')),
  add column if not exists id_card_image_path text,
  add column if not exists verification_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_rejection_reason text;

-- Sync existing verified students
update public.profiles
set verification_status = 'approved'
where is_verified = true and verification_status = 'pending';

-- 2. Create Storage Bucket for ID card verification images (Private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-id-verifications',
  'student-id-verifications',
  false,
  5242880, -- 5 MB max
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects
-- storage.objects already has RLS enabled by Supabase

-- Storage Policy 1: Authenticated user can upload to their own folder (auth.uid())
drop policy if exists "student_upload_id_card_verification" on storage.objects;
create policy "student_upload_id_card_verification"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-id-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage Policy 2: Staff can view all ID card images
drop policy if exists "staff_view_id_card_verification" on storage.objects;
create policy "staff_view_id_card_verification"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-id-verifications'
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin', 'moderator')
  )
);

-- Storage Policy 3: Staff and Service Role can delete verification images upon review
drop policy if exists "staff_delete_id_card_verification" on storage.objects;
create policy "staff_delete_id_card_verification"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-id-verifications'
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin', 'moderator')
  )
);

-- 3. Update public.handle_new_user() trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_staff_role text;
  v_full_name  text;
  v_reg_code   text;
  v_student_id text;
  v_id_card_path text;
  v_code_row   public.registration_codes%rowtype;
begin
  v_staff_role := new.raw_app_meta_data ->> 'staff_role';
  v_full_name  := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    'Unnamed User'
  );

  -- STAFF ACCOUNT
  if v_staff_role is not null then
    if v_staff_role not in ('admin', 'moderator', 'super_admin') then
      raise exception 'Invalid staff_role: %', v_staff_role;
    end if;

    insert into public.profiles (
      id,
      role,
      full_name,
      email,
      is_verified,
      verification_status
    )
    values (
      new.id,
      v_staff_role,
      v_full_name,
      new.email,
      true,
      'approved'
    );

  -- STUDENT ACCOUNT
  else
    v_reg_code     := nullif(trim(new.raw_user_meta_data ->> 'registration_code'), '');
    v_student_id   := nullif(trim(new.raw_user_meta_data ->> 'student_id'), '');
    v_id_card_path := nullif(trim(new.raw_user_meta_data ->> 'id_card_image_path'), '');

    if v_student_id is null then
      raise exception 'A Student ID is required to register.';
    end if;

    -- CASE A: New Registration System (Self-registration with ID Card)
    if v_reg_code is null then
      insert into public.profiles (
        id,
        role,
        full_name,
        student_id,
        email,
        is_verified,
        verification_status,
        id_card_image_path
      )
      values (
        new.id,
        'student',
        v_full_name,
        v_student_id,
        new.email,
        false,
        'pending',
        v_id_card_path
      );

    -- CASE B: Legacy Registration System with Registration Code
    else
      select *
      into v_code_row
      from public.registration_codes
      where code = v_reg_code
        and is_active
        and (expires_at is null or expires_at > now())
        and used_count < max_uses
      for update;

      if not found or v_code_row.student_id <> v_student_id then
        raise exception 'Invalid registration code or Student ID.';
      end if;

      update public.registration_codes
      set used_count = used_count + 1
      where id = v_code_row.id;

      insert into public.profiles (
        id,
        role,
        full_name,
        student_id,
        email,
        department_id,
        batch_id,
        current_level_id,
        current_term_id,
        is_verified,
        verification_status,
        id_card_image_path
      )
      values (
        new.id,
        'student',
        v_full_name,
        v_code_row.student_id,
        new.email,
        v_code_row.department_id,
        v_code_row.batch_id,
        v_code_row.level_id,
        v_code_row.term_id,
        false,
        'pending',
        v_id_card_path
      );
    end if;
  end if;

  return new;
end;
$function$;

-- 4. Upgraded verify_student() RPC: Pulls Level, Term, Dept from registration_codes and approves
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
  v_code_row public.registration_codes%rowtype;
  v_previous_state jsonb;
  v_new_state jsonb;
  v_dept_id uuid;
  v_batch_id uuid;
  v_level_id uuid;
  v_term_id uuid;
begin
  select *
  into v_student
  from public.profiles
  where id = target_student_id
    and role = 'student'
  for update;

  if not found then
    raise exception 'Target user is not a student.';
  end if;

  if v_student.is_verified and v_student.verification_status = 'approved' then
    raise exception 'Student is already verified.';
  end if;

  -- Look up pre-existing Registration Record for Level & Term
  select *
  into v_code_row
  from public.registration_codes
  where student_id = v_student.student_id
  order by created_at desc
  limit 1;

  if found then
    v_dept_id := coalesce(v_code_row.department_id, v_student.department_id);
    v_batch_id := coalesce(v_code_row.batch_id, v_student.batch_id);
    v_level_id := coalesce(v_code_row.level_id, v_student.current_level_id);
    v_term_id := coalesce(v_code_row.term_id, v_student.current_term_id);
  else
    v_dept_id := v_student.department_id;
    v_batch_id := v_student.batch_id;
    v_level_id := v_student.current_level_id;
    v_term_id := v_student.current_term_id;
  end if;

  if v_dept_id is not null and not public.can_verify_students(v_dept_id) then
    raise exception 'Not authorized to verify this student for their department.';
  end if;

  v_previous_state := to_jsonb(v_student);

  update public.profiles
  set
    is_verified = true,
    verification_status = 'approved',
    department_id = v_dept_id,
    batch_id = v_batch_id,
    current_level_id = v_level_id,
    current_term_id = v_term_id,
    verification_reviewed_by = auth.uid(),
    verification_reviewed_at = now(),
    verification_rejection_reason = null
  where id = target_student_id;

  if v_code_row.id is not null then
    update public.registration_codes
    set is_active = false
    where id = v_code_row.id;
  end if;

  select * into v_student from public.profiles where id = target_student_id;
  v_new_state := to_jsonb(v_student);

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
    'verify_student_approved',
    'profiles',
    target_student_id,
    v_previous_state,
    v_new_state
  );
end;
$$;

grant execute on function public.verify_student(uuid) to authenticated;

-- 5. New reject_student_verification() RPC
create or replace function public.reject_student_verification(
  target_student_id uuid,
  p_reason text
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
  select *
  into v_student
  from public.profiles
  where id = target_student_id
    and role = 'student'
  for update;

  if not found then
    raise exception 'Target user is not a student.';
  end if;

  if v_student.department_id is not null and not public.can_verify_students(v_student.department_id) then
    raise exception 'Not authorized to reject this student for their department.';
  end if;

  v_previous_state := to_jsonb(v_student);

  update public.profiles
  set
    is_verified = false,
    verification_status = 'rejected',
    verification_rejection_reason = coalesce(nullif(trim(p_reason), ''), 'Student ID card verification could not be confirmed.'),
    verification_reviewed_by = auth.uid(),
    verification_reviewed_at = now()
  where id = target_student_id;

  select * into v_student from public.profiles where id = target_student_id;
  v_new_state := to_jsonb(v_student);

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
    'verify_student_rejected',
    'profiles',
    target_student_id,
    v_previous_state,
    v_new_state
  );
end;
$$;

grant execute on function public.reject_student_verification(uuid, text) to authenticated;
