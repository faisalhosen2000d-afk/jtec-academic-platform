create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_full_name       text;
  v_reg_code        text;
  v_student_id      text;
  v_staff_token     text;
  v_admin_request   text;
  v_requested_role  text;
  v_staff_request   public.staff_provisioning_requests%rowtype;
  v_code_row        public.registration_codes%rowtype;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    'Unnamed User'
  );

  -- ==========================================================
  -- EXISTING STAFF ACCOUNT PROVISIONING
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

    update public.staff_provisioning_requests
    set consumed_at = now()
    where token = v_staff_request.token;

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
  -- NEW PUBLIC ADMINISTRATION ACCOUNT REQUEST
  -- ==========================================================

  v_admin_request :=
    nullif(
      trim(new.raw_user_meta_data ->> 'administration_account_request'),
      ''
    );

  if v_admin_request = 'true' then

    v_requested_role :=
      lower(
        trim(new.raw_user_meta_data ->> 'requested_role')
      );

    if v_requested_role not in ('admin', 'moderator') then
      raise exception
        'Invalid administration account role.';
    end if;

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
      v_requested_role,
      v_full_name,
      new.email,
      false,
      false
    );

    insert into public.administration_account_requests (
      user_id,
      full_name,
      email,
      requested_role,
      status
    )
    values (
      new.id,
      v_full_name,
      new.email,
      v_requested_role,
      'pending'
    );

    return new;
  end if;


  -- ==========================================================
  -- EXISTING STUDENT ACCOUNT REGISTRATION
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

  select *
  into v_code_row
  from public.registration_codes
  where code = v_reg_code
    and is_active
    and (expires_at is null or expires_at > now())
    and used_count < max_uses
  for update;

  if not found
     or v_code_row.student_id <> v_student_id then
    raise exception
      'Invalid registration code or Student ID.';
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
