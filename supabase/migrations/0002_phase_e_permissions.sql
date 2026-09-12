-- ============================================================
-- JTEC Academic Platform — Phase E: Role & Permission System
-- staff_scopes, moderator_escalations, permission helper functions,
-- RLS baseline for all existing tables
-- ============================================================

-- ------------------------------------------------------------
-- staff_scopes
-- ------------------------------------------------------------
create table public.staff_scopes (
  id                            uuid primary key default gen_random_uuid(),
  profile_id                    uuid not null references public.profiles(id) on delete cascade,
  department_id                 uuid references public.departments(id) on delete cascade,
  can_verify_students           boolean not null default false,
  can_verify_results            boolean not null default false,
  can_manage_upload_permission  boolean not null default false,
  can_approve_materials         boolean not null default true,
  granted_by                    uuid references public.profiles(id) on delete set null,
  created_at                    timestamptz not null default now(),
  unique (profile_id, department_id)
);

comment on table public.staff_scopes is
'Per-Admin, optionally per-department, capability grants. department_id NULL = scope applies across all departments for that profile. Only Super Admin may write to this table. Capability checks additionally require role = admin at query time — a scope row alone is not sufficient.';

create index idx_staff_scopes_profile_id
on public.staff_scopes (profile_id);


-- ------------------------------------------------------------
-- moderator_escalations
-- ------------------------------------------------------------
create table public.moderator_escalations (
  id            uuid primary key default gen_random_uuid(),
  moderator_id  uuid not null references public.profiles(id) on delete cascade,
  action_type   text not null,
  target_table  text not null,
  target_id     uuid not null,
  payload       jsonb not null,
  status        text not null default 'pending'
                check (status in ('pending','approved','denied')),
  reviewed_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

comment on table public.moderator_escalations is
'Sensitive actions attempted by a Moderator beyond their fixed capability set are recorded here instead of executing directly, pending Super Admin review.';

create index idx_moderator_escalations_status
on public.moderator_escalations (status);

create index idx_moderator_escalations_moderator
on public.moderator_escalations (moderator_id);


-- ============================================================
-- Permission helper functions
-- ============================================================

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;


create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'super_admin';
$$;


create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;


create or replace function public.is_moderator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'moderator';
$$;


create or replace function public.is_student()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'student';
$$;


create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role()
    in ('super_admin', 'admin', 'moderator');
$$;


-- ------------------------------------------------------------
-- Scoped capability checks
-- ------------------------------------------------------------

create or replace function public.can_verify_students(
  p_department_id uuid default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_super_admin()
    or (
      public.is_admin()
      and exists (
        select 1
        from public.staff_scopes
        where profile_id = auth.uid()
          and can_verify_students = true
          and (
            department_id = p_department_id
            or department_id is null
          )
      )
    );
$$;


create or replace function public.can_verify_results(
  p_department_id uuid default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_super_admin()
    or (
      public.is_admin()
      and exists (
        select 1
        from public.staff_scopes
        where profile_id = auth.uid()
          and can_verify_results = true
          and (
            department_id = p_department_id
            or department_id is null
          )
      )
    );
$$;


create or replace function public.can_manage_upload_permission(
  p_department_id uuid default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_super_admin()
    or (
      public.is_admin()
      and exists (
        select 1
        from public.staff_scopes
        where profile_id = auth.uid()
          and can_manage_upload_permission = true
          and (
            department_id = p_department_id
            or department_id is null
          )
      )
    );
$$;


create or replace function public.can_approve_materials(
  p_department_id uuid default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_super_admin()
    or (
      public.is_admin()
      and exists (
        select 1
        from public.staff_scopes
        where profile_id = auth.uid()
          and can_approve_materials = true
          and (
            department_id = p_department_id
            or department_id is null
          )
      )
    );
$$;


-- ============================================================
-- Upgrade verify_student() from Phase D
-- ============================================================

create or replace function public.verify_student(
  target_student_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_department_id uuid;
begin

  select department_id
  into v_department_id
  from public.profiles
  where id = target_student_id
    and role = 'student';

  if not found then
    raise exception 'Target user is not a student.';
  end if;

  if not public.can_verify_students(v_department_id) then
    raise exception 'Not authorized to verify this student.';
  end if;

  update public.profiles
  set is_verified = true
  where id = target_student_id;

end;
$$;


grant execute on function public.verify_student(uuid)
to authenticated;


-- ============================================================
-- Generic moderator escalation functions
-- ============================================================

create or replace function public.create_moderator_escalation(
  p_action_type  text,
  p_target_table text,
  p_target_id    uuid,
  p_payload      jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin

  if not public.is_moderator() then
    raise exception
      'Only moderators create escalations through this function.';
  end if;

  insert into public.moderator_escalations (
    moderator_id,
    action_type,
    target_table,
    target_id,
    payload,
    status
  )
  values (
    auth.uid(),
    p_action_type,
    p_target_table,
    p_target_id,
    p_payload,
    'pending'
  )
  returning id into v_id;

  return v_id;

end;
$$;


grant execute on function public.create_moderator_escalation(
  text,
  text,
  uuid,
  jsonb
)
to authenticated;


create or replace function public.resolve_moderator_escalation(
  p_escalation_id uuid,
  p_approve       boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.is_super_admin() then
    raise exception 'Only Super Admin may resolve escalations.';
  end if;

  update public.moderator_escalations
  set
    status      = case
                    when p_approve then 'approved'
                    else 'denied'
                  end,
    reviewed_by = auth.uid(),
    resolved_at = now()
  where id = p_escalation_id
    and status = 'pending';

  -- The originally escalated action is executed in the phase
  -- that introduces its target table.

end;
$$;


grant execute on function public.resolve_moderator_escalation(
  uuid,
  boolean
)
to authenticated;


-- ============================================================
-- Row Level Security — staff_scopes
-- ============================================================

alter table public.staff_scopes
enable row level security;


create policy "Super admin manages staff_scopes"
  on public.staff_scopes
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


create policy "Admins can view their own scopes"
  on public.staff_scopes
  for select
  to authenticated
  using (profile_id = auth.uid());


-- ============================================================
-- Row Level Security — moderator_escalations
-- ============================================================

alter table public.moderator_escalations
enable row level security;


create policy "Moderators can view their own escalations"
  on public.moderator_escalations
  for select
  to authenticated
  using (moderator_id = auth.uid());


create policy "Super admin can view all escalations"
  on public.moderator_escalations
  for select
  to authenticated
  using (public.is_super_admin());


create policy "Super admin can resolve escalations"
  on public.moderator_escalations
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- No direct client INSERT policy.
-- Rows are created only via
-- create_moderator_escalation().


-- ============================================================
-- Row Level Security — registration_codes
-- ============================================================

create policy "Super admin manages registration codes"
  on public.registration_codes
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- ============================================================
-- Row Level Security — profiles
-- ============================================================

create policy "Super admin can select all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_super_admin());


create policy "Moderators can select profiles for support"
  on public.profiles
  for select
  to authenticated
  using (public.is_moderator());


create policy "Admins can select profiles within scope"
  on public.profiles
  for select
  to authenticated
  using (
    public.is_admin()
    and exists (
      select 1
      from public.staff_scopes ss
      where ss.profile_id = auth.uid()
        and (
          ss.department_id = profiles.department_id
          or ss.department_id is null
        )
    )
  );


create policy "Super admin can update any profile"
  on public.profiles
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- Admin/Moderator have no direct UPDATE policy on profiles.
-- Their permitted mutations go through scoped SECURITY
-- DEFINER functions such as verify_student().


-- ============================================================
-- Row Level Security — academic structure
-- Super Admin only
-- ============================================================

create policy "Super admin can insert departments"
  on public.departments
  for insert
  to authenticated
  with check (public.is_super_admin());


create policy "Super admin can update departments"
  on public.departments
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


create policy "Super admin can delete departments"
  on public.departments
  for delete
  to authenticated
  using (public.is_super_admin());


create policy "Super admin can insert batches"
  on public.batches
  for insert
  to authenticated
  with check (public.is_super_admin());


create policy "Super admin can update batches"
  on public.batches
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


create policy "Super admin can delete batches"
  on public.batches
  for delete
  to authenticated
  using (public.is_super_admin());


create policy "Super admin can insert levels"
  on public.levels
  for insert
  to authenticated
  with check (public.is_super_admin());


create policy "Super admin can update levels"
  on public.levels
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


create policy "Super admin can delete levels"
  on public.levels
  for delete
  to authenticated
  using (public.is_super_admin());


create policy "Super admin can insert terms"
  on public.terms
  for insert
  to authenticated
  with check (public.is_super_admin());


create policy "Super admin can update terms"
  on public.terms
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


create policy "Super admin can delete terms"
  on public.terms
  for delete
  to authenticated
  using (public.is_super_admin());


create policy "Super admin can insert subjects"
  on public.subjects
  for insert
  to authenticated
  with check (public.is_super_admin());


create policy "Super admin can update subjects"
  on public.subjects
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


create policy "Super admin can delete subjects"
  on public.subjects
  for delete
  to authenticated
  using (public.is_super_admin());