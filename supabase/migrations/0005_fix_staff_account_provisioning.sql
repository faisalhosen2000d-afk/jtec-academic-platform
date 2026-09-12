-- ============================================================
-- 0005. SECURE STAFF ACCOUNT PROVISIONING
-- ============================================================
--
-- Student registration remains protected by:
--   registration_code + Student ID
--
-- Staff accounts are provisioned only through the trusted
-- Super Admin server action.
--
-- The server action creates a short-lived, one-time provisioning
-- request before creating the Auth user.
--
-- The Auth trigger validates that request and creates the staff
-- profile inside the same Auth user-creation transaction.
-- ============================================================

create table if not exists public.staff_provisioning_requests (
  token text primary key,
  role text not null
    check (role in ('admin', 'moderator')),
  full_name text not null,
  email text not null,
  created_by uuid
    references public.profiles(id)
    on delete set null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_provisioning_requests_expires
  on public.staff_provisioning_requests(expires_at);

create index if not exists idx_staff_provisioning_requests_created_by
  on public.staff_provisioning_requests(created_by);

alter table public.staff_provisioning_requests enable row level security;

revoke all on table public.staff_provisioning_requests
  from anon, authenticated, public;

grant select, insert, update, delete
  on table public.staff_provisioning_requests
  to service_role;


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_full_name       text;
  v_reg_code        text;
  v_student_id      text;
  v_staff_token     text;
  v_staff_request   public.staff_provisioning_requests%rowtype;
  v_code_row        public.registration_codes%rowtype;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    'Unnamed User'
  );

  -- ==========================================================
  -- STAFF ACCOUNT
  -- ==========================================================

  v_staff_token :=
    nullif(
      trim(new.raw_user_meta_data ->> 'staff_provisioning_token'),
      ''
    );

  if v_staff_token is not null then

    select *
    into v_staff_request
    from public.staff_provisioning_requests
    where token = v_staff_token
      and consumed_at is null
      and expires_at > now()
    for update;

    if not found then
      raise exception
        'Invalid or expired staff provisioning request.';
    end if;

    if lower(trim(coalesce(new.email, ''))) <>
       lower(trim(v_staff_request.email)) then
      raise exception
        'Staff provisioning request does not match the account email.';
    end if;

    -- Consume the request so it cannot be reused.
    update public.staff_provisioning_requests
    set consumed_at = now()
    where token = v_staff_request.token;

    -- Create the staff profile.
    insert into public.profiles (
      id,
      role,
      full_name,
      email,
      is_verified,
      upload_disabled
    )
    values (
      new.id,
      v_staff_request.role,
      v_staff_request.full_name,
      new.email,
      true,
      false
    );

    return new;
  end if;


  -- ==========================================================
  -- STUDENT ACCOUNT
  -- ==========================================================

  v_reg_code :=
    new.raw_user_meta_data ->> 'registration_code';

  v_student_id :=
    nullif(
      trim(new.raw_user_meta_data ->> 'student_id'),
      ''
    );

  if v_reg_code is null
     or length(trim(v_reg_code)) = 0 then
    raise exception
      'A valid registration code is required to register.';
  end if;

  if v_student_id is null then
    raise exception
      'A Student ID is required to register.';
  end if;

  -- Find and lock the registration code.
  select *
  into v_code_row
  from public.registration_codes
  where code = v_reg_code
    and is_active
    and (expires_at is null or expires_at > now())
    and used_count < max_uses
  for update;

  -- Single generic failure for every case:
  -- code not found, inactive, expired, exhausted,
  -- or Student ID mismatch.
  if not found
     or v_code_row.student_id <> v_student_id then
    raise exception
      'Invalid registration code or Student ID.';
  end if;

  -- Consume one use of the registration code.
  update public.registration_codes
  set used_count = used_count + 1
  where id = v_code_row.id;

  -- Create the student profile.
  --
  -- Academic information comes ONLY from the registration
  -- code. The student cannot choose these values from the
  -- registration form.
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
    is_verified
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
    false
  );

  return new;
end;
$function$;

revoke execute
  on function public.handle_new_user()
  from public, anon, authenticated;
