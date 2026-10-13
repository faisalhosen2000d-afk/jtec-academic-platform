-- ============================================================
-- JTEC Academic Progression
-- ============================================================


create table if not exists public.academic_progression_history (
    id uuid primary key default gen_random_uuid(),
    operation_id uuid not null,
    student_profile_id uuid not null
        references public.profiles(id) on delete restrict,
    actor_id uuid references public.profiles(id) on delete set null,
    previous_state jsonb not null,
    new_state jsonb not null,
    reason text not null check (length(btrim(reason)) > 0),
    created_at timestamptz not null default now()
);

create index if not exists idx_academic_progression_history_operation
    on public.academic_progression_history(operation_id);

create index if not exists idx_academic_progression_history_student
    on public.academic_progression_history(student_profile_id, created_at desc);

alter table public.academic_progression_history enable row level security;

drop policy if exists "Super admins can read academic progression history"
    on public.academic_progression_history;

create policy "Super admins can read academic progression history"
    on public.academic_progression_history
    for select
    to authenticated
    using (public.is_super_admin());

revoke all on table public.academic_progression_history from public;
revoke all on table public.academic_progression_history from anon;
revoke insert, update, delete on table public.academic_progression_history
    from authenticated;
grant select on table public.academic_progression_history to authenticated;

create or replace function public.apply_academic_progression(
    p_batch_id uuid,
    p_expected_current_level_id uuid,
    p_expected_current_term_id uuid,
    p_target_level_id uuid,
    p_target_term_id uuid,
    p_expected_student_ids uuid[],
    p_reason text
)
returns table (
    operation_id uuid,
    updated_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_actor_id uuid;
    v_operation_id uuid;
    v_student record;
    v_count integer := 0;
    v_locked_count integer := 0;
    v_actual_ids uuid[] := array[]::uuid[];
    v_expected_ids uuid[];
    v_previous_state jsonb;
    v_new_state jsonb;
begin
    v_actor_id := auth.uid();

    if v_actor_id is null or not public.is_super_admin() then
        raise exception 'Only Super Admin can apply academic progression.'
            using errcode = '42501';
    end if;

    if p_batch_id is null
       or p_expected_current_level_id is null
       or p_expected_current_term_id is null
       or p_target_level_id is null
       or p_target_term_id is null then
        raise exception 'Batch, current assignment, and target assignment are required.';
    end if;

    if p_expected_student_ids is null
       or cardinality(p_expected_student_ids) = 0 then
        raise exception 'Preview must contain at least one student.';
    end if;

    if array_position(p_expected_student_ids, null) is not null then
        raise exception 'Preview contains an invalid student ID.';
    end if;

    if (
        select count(distinct selected_id)
        from unnest(p_expected_student_ids) as selected(selected_id)
    ) <> cardinality(p_expected_student_ids) then
        raise exception 'Duplicate student IDs are not allowed.';
    end if;

    select array_agg(selected_id order by selected_id)
      into v_expected_ids
    from unnest(p_expected_student_ids) as selected(selected_id);

    if p_reason is null
       or length(btrim(p_reason)) = 0
       or length(btrim(p_reason)) > 1000 then
        raise exception 'A reason of 1 to 1000 characters is required.';
    end if;

    if p_expected_current_level_id = p_target_level_id
       and p_expected_current_term_id = p_target_term_id then
        raise exception 'Target assignment is identical to current assignment.';
    end if;

    if not exists (
        select 1 from public.batches b where b.id = p_batch_id
    ) then
        raise exception 'Selected Batch does not exist.';
    end if;

    if not exists (
        select 1 from public.levels l
        where l.id = p_expected_current_level_id
    ) then
        raise exception 'Current Level does not exist.';
    end if;

    if not exists (
        select 1 from public.terms t
        where t.id = p_expected_current_term_id
          and t.level_id = p_expected_current_level_id
    ) then
        raise exception 'Current Term does not belong to the current Level.';
    end if;

    if not exists (
        select 1 from public.levels l where l.id = p_target_level_id
    ) then
        raise exception 'Target Level does not exist.';
    end if;

    if not exists (
        select 1 from public.terms t
        where t.id = p_target_term_id
          and t.level_id = p_target_level_id
    ) then
        raise exception 'Target Term does not belong to the target Level.';
    end if;

    -- Serialize promotion attempts for the same Batch.
    -- Registration must acquire this exact transaction lock too
    -- before inserting a student Profile for this Batch.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_batch_id::text, 0)
    );

    -- Lock the complete current cohort in a deterministic order.
    -- The preview ID list must exactly match this database-derived cohort.
    for v_student in
        select
            p.id,
            p.role,
            p.full_name,
            p.student_id,
            p.batch_id,
            p.current_level_id,
            p.current_term_id
        from public.profiles p
        where p.batch_id = p_batch_id
          and p.current_level_id = p_expected_current_level_id
          and p.current_term_id = p_expected_current_term_id
          and p.role = 'student'
        order by p.id
        for update
    loop
        if v_student.role is distinct from 'student' then
            raise exception 'A selected profile is not a student.';
        end if;

        v_actual_ids := array_append(v_actual_ids, v_student.id);
        v_locked_count := v_locked_count + 1;
    end loop;

    if v_locked_count = 0 then
        raise exception 'No students match the selected Batch and current assignment.';
    end if;

    if v_actual_ids is distinct from v_expected_ids then
        raise exception
            'The cohort changed after preview. Refresh the preview before confirming.';
    end if;

    v_operation_id := gen_random_uuid();

    -- Every profile is locked and the preview list has been validated.
    -- Any error aborts the entire function transaction.
    for v_student in
        select
            p.id,
            p.full_name,
            p.student_id,
            p.batch_id,
            p.current_level_id,
            p.current_term_id
        from public.profiles p
        where p.id = any(v_actual_ids)
        order by p.id
    loop
        v_previous_state := jsonb_build_object(
            'id', v_student.id,
            'batch_id', v_student.batch_id,
            'current_level_id', v_student.current_level_id,
            'current_term_id', v_student.current_term_id
        );

        update public.profiles
        set
            current_level_id = p_target_level_id,
            current_term_id = p_target_term_id
        where id = v_student.id
          and batch_id = p_batch_id
          and current_level_id = p_expected_current_level_id
          and current_term_id = p_expected_current_term_id
          and role = 'student';

        if not found then
            raise exception 'A student assignment changed during progression.';
        end if;

        v_new_state := jsonb_build_object(
            'id', v_student.id,
            'batch_id', v_student.batch_id,
            'current_level_id', p_target_level_id,
            'current_term_id', p_target_term_id
        );

        insert into public.academic_progression_history (
            operation_id,
            student_profile_id,
            actor_id,
            previous_state,
            new_state,
            reason
        )
        values (
            v_operation_id,
            v_student.id,
            v_actor_id,
            v_previous_state,
            v_new_state,
            btrim(p_reason)
        );

        v_count := v_count + 1;
    end loop;

    -- Keep unused registration codes aligned with the new Batch assignment.
    -- Registration acquires the same Batch advisory lock and re-reads the code
    -- after waiting, so a later registration receives the new Level and Term.
    update public.registration_codes
    set
        level_id = p_target_level_id,
        term_id = p_target_term_id
    where batch_id = p_batch_id
      and level_id = p_expected_current_level_id
      and term_id = p_expected_current_term_id
      and is_active
      and used_count < max_uses;

    if v_count <> v_locked_count then
        raise exception 'Updated count did not match the validated cohort.';
    end if;

    return query select v_operation_id, v_count;
end;
$function$;

revoke all on function public.apply_academic_progression(
    uuid, uuid, uuid, uuid, uuid, uuid[], text
) from public, anon;

grant execute on function public.apply_academic_progression(
    uuid, uuid, uuid, uuid, uuid, uuid[], text
) to authenticated;
