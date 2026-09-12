-- ============================================================
-- JTEC Academic Platform
-- Phase C — Initial Database Schema
-- Migration: 0001_initial_schema.sql
--
-- Based on:
-- docs/architecture/01-architecture-proposal.md
-- docs/architecture/02-finalized-precoding-spec.md
--
-- IMPORTANT:
-- This migration creates the core database schema only.
-- Role/permission RLS is handled in the later Phase E migration.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 1. ACADEMIC STRUCTURE
-- ============================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);


create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);


create table public.levels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order smallint not null unique
);


create table public.terms (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null
    references public.levels(id)
    on delete cascade,
  name text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),

  constraint terms_level_sort_unique
    unique (level_id, sort_order)
);


-- ============================================================
-- 2. PROFILES
-- ============================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  role text not null default 'student'
    check (
      role in (
        'super_admin',
        'admin',
        'moderator',
        'student'
      )
    ),

  full_name text not null,

  student_id text unique,

  email text not null unique,

  avatar_url text,

  department_id uuid
    references public.departments(id)
    on delete set null,

  batch_id uuid
    references public.batches(id)
    on delete set null,

  current_level_id uuid
    references public.levels(id)
    on delete set null,

  current_term_id uuid
    references public.terms(id)
    on delete set null,

  is_verified boolean not null default false,

  upload_disabled boolean not null default false,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


create index idx_profiles_role
  on public.profiles(role);

create index idx_profiles_department_batch
  on public.profiles(department_id, batch_id);

create index idx_profiles_student_id
  on public.profiles(student_id);


-- ============================================================
-- 3. SUBJECTS
-- ============================================================

create table public.subjects (
  id uuid primary key default gen_random_uuid(),

  department_id uuid not null
    references public.departments(id)
    on delete cascade,

  level_id uuid not null
    references public.levels(id)
    on delete restrict,

  term_id uuid not null
    references public.terms(id)
    on delete restrict,

  subject_code text not null,

  subject_name text not null,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint subjects_unique_code
    unique (
      department_id,
      level_id,
      term_id,
      subject_code
    )
);


create index idx_subjects_academic_filter
  on public.subjects(
    department_id,
    level_id,
    term_id
  );


-- ============================================================
-- 4. OFFICIAL FOLDERS
-- ============================================================

create table public.folders (
  id uuid primary key default gen_random_uuid(),

  department_id uuid not null
    references public.departments(id)
    on delete cascade,

  level_id uuid not null
    references public.levels(id)
    on delete cascade,

  term_id uuid
    references public.terms(id)
    on delete cascade,

  subject_id uuid
    references public.subjects(id)
    on delete cascade,

  name text not null,

  parent_folder_id uuid
    references public.folders(id)
    on delete cascade,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now()
);


create index idx_folders_academic
  on public.folders(
    department_id,
    level_id,
    term_id,
    subject_id
  );

create index idx_folders_parent
  on public.folders(parent_folder_id);


-- ============================================================
-- 5. MATERIALS
-- ============================================================

create table public.materials (
  id uuid primary key default gen_random_uuid(),

  uploader_id uuid not null
    references public.profiles(id)
    on delete cascade,

  folder_id uuid
    references public.folders(id)
    on delete set null,

  subject_id uuid not null
    references public.subjects(id)
    on delete restrict,

  -- Denormalized academic filter fields.
  -- These are synchronized from subject_id by trigger.
  department_id uuid not null
    references public.departments(id)
    on delete restrict,

  level_id uuid not null
    references public.levels(id)
    on delete restrict,

  term_id uuid not null
    references public.terms(id)
    on delete restrict,

  title text not null,

  description text,

  topic text,

  keywords text[],

  file_path text not null,

  file_type text not null,

  file_size_bytes bigint not null
    check (file_size_bytes > 0),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected',
        'private',
        'removed'
      )
    ),

  reviewed_by uuid
    references public.profiles(id)
    on delete set null,

  reviewed_at timestamptz,

  rejection_reason text,

  views_count integer not null default 0
    check (views_count >= 0),

  downloads_count integer not null default 0
    check (downloads_count >= 0),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  search_vector tsvector
    generated always as (
      to_tsvector(
        'simple',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(topic, '') || ' ' ||
        coalesce(array_to_string(keywords, ' '), '')
      )
    ) stored
);


create index idx_materials_status
  on public.materials(status);

create index idx_materials_academic
  on public.materials(
    department_id,
    level_id,
    term_id,
    subject_id
  );

create index idx_materials_uploader
  on public.materials(uploader_id);

create index idx_materials_keywords
  on public.materials using gin(keywords);

create index idx_materials_search
  on public.materials using gin(search_vector);


-- ============================================================
-- 6. MATERIAL INTERACTION TABLES
-- ============================================================

create table public.material_ratings (
  id uuid primary key default gen_random_uuid(),

  material_id uuid not null
    references public.materials(id)
    on delete cascade,

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  stars smallint not null
    check (stars between 1 and 5),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint material_ratings_unique
    unique(material_id, student_id)
);


create table public.material_comments (
  id uuid primary key default gen_random_uuid(),

  material_id uuid not null
    references public.materials(id)
    on delete cascade,

  author_id uuid not null
    references public.profiles(id)
    on delete cascade,

  content text not null,

  is_hidden boolean not null default false,

  created_at timestamptz not null default now()
);


create table public.material_bookmarks (
  id uuid primary key default gen_random_uuid(),

  material_id uuid not null
    references public.materials(id)
    on delete cascade,

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  constraint material_bookmarks_unique
    unique(material_id, student_id)
);


create table public.material_reports (
  id uuid primary key default gen_random_uuid(),

  material_id uuid not null
    references public.materials(id)
    on delete cascade,

  reporter_id uuid not null
    references public.profiles(id)
    on delete cascade,

  reason text not null,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'reviewing',
        'resolved',
        'dismissed'
      )
    ),

  handled_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  resolved_at timestamptz
);


create table public.material_view_logs (
  id uuid primary key default gen_random_uuid(),

  material_id uuid not null
    references public.materials(id)
    on delete cascade,

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  viewed_at timestamptz not null default now()
);


create index idx_material_view_logs_material_time
  on public.material_view_logs(material_id, viewed_at);


create table public.material_download_logs (
  id uuid primary key default gen_random_uuid(),

  material_id uuid not null
    references public.materials(id)
    on delete cascade,

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  downloaded_at timestamptz not null default now()
);


create index idx_material_download_logs_material_time
  on public.material_download_logs(material_id, downloaded_at);


-- ============================================================
-- 7. PERSONAL FOLDERS
-- ============================================================

create table public.personal_folders (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  name text not null,

  created_at timestamptz not null default now(),

  constraint personal_folders_unique_name
    unique(student_id, name)
);


create table public.personal_folder_items (
  id uuid primary key default gen_random_uuid(),

  personal_folder_id uuid not null
    references public.personal_folders(id)
    on delete cascade,

  material_id uuid not null
    references public.materials(id)
    on delete cascade,

  added_at timestamptz not null default now(),

  constraint personal_folder_items_unique
    unique(personal_folder_id, material_id)
);


-- ============================================================
-- 8. REGISTRATION CODES
-- ============================================================

create table public.registration_codes (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  role_scope text not null default 'student'
    check (role_scope = 'student'),

  department_id uuid
    references public.departments(id)
    on delete set null,

  batch_id uuid
    references public.batches(id)
    on delete set null,

  max_uses integer not null
    check (max_uses > 0),

  used_count integer not null default 0
    check (
      used_count >= 0
      and used_count <= max_uses
    ),

  expires_at timestamptz,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);


create index idx_registration_codes_active
  on public.registration_codes(is_active);


-- ============================================================
-- 9. UPLOAD PERMISSION AUDIT
-- ============================================================

create table public.upload_permission_actions (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  action text not null
    check (
      action in (
        'disabled',
        're-enabled'
      )
    ),

  reason text not null,

  actor_id uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now()
);


create index idx_upload_permission_actions_student
  on public.upload_permission_actions(student_id);


-- ============================================================
-- 10. NOTICE CATEGORIES
-- ============================================================

create table public.notice_categories (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,

  is_custom boolean not null default false,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 11. NOTICES
-- ============================================================

create table public.notices (
  id uuid primary key default gen_random_uuid(),

  title text not null,

  content text not null,

  category_id uuid
    references public.notice_categories(id)
    on delete set null,

  target_scope text not null
    check (
      target_scope in (
        'all',
        'department',
        'batch',
        'level',
        'term'
      )
    ),

  target_department_id uuid
    references public.departments(id)
    on delete set null,

  target_batch_id uuid
    references public.batches(id)
    on delete set null,

  target_level_id uuid
    references public.levels(id)
    on delete set null,

  target_term_id uuid
    references public.terms(id)
    on delete set null,

  is_pinned boolean not null default false,

  is_archived boolean not null default false,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now()
);


-- Ensure target field matches target_scope.
alter table public.notices
add constraint notices_target_scope_consistency
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
    and target_batch_id is null
    and target_level_id is null
    and target_term_id is null
  )
  or
  (
    target_scope = 'batch'
    and target_department_id is null
    and target_batch_id is not null
    and target_level_id is null
    and target_term_id is null
  )
  or
  (
    target_scope = 'level'
    and target_department_id is null
    and target_batch_id is null
    and target_level_id is not null
    and target_term_id is null
  )
  or
  (
    target_scope = 'term'
    and target_department_id is null
    and target_batch_id is null
    and target_level_id is null
    and target_term_id is not null
  )
);


-- ============================================================
-- 12. NOTICE ATTACHMENTS
-- ============================================================

create table public.notice_attachments (
  id uuid primary key default gen_random_uuid(),

  notice_id uuid not null
    references public.notices(id)
    on delete cascade,

  file_path text not null,

  file_type text not null,

  file_size_bytes bigint not null
    check (file_size_bytes > 0)
);


-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  recipient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  type text not null,

  title text not null,

  body text not null,

  link_url text,

  is_read boolean not null default false,

  created_at timestamptz not null default now()
);


create index idx_notifications_recipient_read_created
  on public.notifications(
    recipient_id,
    is_read,
    created_at
  );


-- ============================================================
-- 14. RESULTS
-- ============================================================

create table public.results (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  term_id uuid not null
    references public.terms(id)
    on delete restrict,

  file_path text not null,

  gpa numeric(3,2)
    check (gpa between 0 and 4),

  cgpa numeric(3,2)
    check (cgpa between 0 and 4),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'verified',
        'rejected'
      )
    ),

  verified_by uuid
    references public.profiles(id)
    on delete set null,

  verified_at timestamptz,

  created_at timestamptz not null default now(),

  constraint results_student_term_unique
    unique(student_id, term_id)
);


create index idx_results_student
  on public.results(student_id);

create index idx_results_status
  on public.results(status);


-- ============================================================
-- 15. RANKING SNAPSHOTS
-- ============================================================

create table public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  term_id uuid not null
    references public.terms(id)
    on delete cascade,

  department_rank integer,

  batch_overall_rank integer,

  computed_cgpa numeric(3,2) not null
    check (computed_cgpa between 0 and 4),

  computed_at timestamptz not null default now(),

  constraint ranking_snapshots_student_term_unique
    unique(student_id, term_id)
);


create index idx_ranking_snapshots_term
  on public.ranking_snapshots(term_id);


-- ============================================================
-- 16. CONTRIBUTOR SCORE SNAPSHOTS
-- ============================================================

create table public.contributor_score_snapshots (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  period_month date not null,

  score numeric not null,

  approved_uploads_count integer not null default 0,

  weighted_rating numeric not null default 0,

  total_views integer not null default 0,

  total_downloads integer not null default 0,

  computed_at timestamptz not null default now(),

  constraint contributor_score_month_unique
    unique(profile_id, period_month)
);


create index idx_contributor_scores_period
  on public.contributor_score_snapshots(period_month);


-- ============================================================
-- 17. AUDIT LOGS
-- ============================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_id uuid
    references public.profiles(id)
    on delete set null,

  action text not null,

  target_table text not null,

  target_id uuid not null,

  previous_state jsonb,

  new_state jsonb,

  created_at timestamptz not null default now()
);


create index idx_audit_logs_actor
  on public.audit_logs(actor_id);

create index idx_audit_logs_target
  on public.audit_logs(target_table, target_id);

create index idx_audit_logs_created
  on public.audit_logs(created_at);


-- ============================================================
-- 18. MATERIAL ACADEMIC CONTEXT SYNC
-- ============================================================
--
-- Architecture requires department_id / level_id / term_id
-- in materials to remain synchronized with subject_id.
--
-- The subject is the source of truth.
-- ============================================================

create or replace function public.sync_material_academic_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_department_id uuid;
  v_level_id uuid;
  v_term_id uuid;
begin

  select
    department_id,
    level_id,
    term_id
  into
    v_department_id,
    v_level_id,
    v_term_id
  from public.subjects
  where id = new.subject_id;

  if not found then
    raise exception 'Invalid subject_id: %', new.subject_id;
  end if;

  new.department_id := v_department_id;
  new.level_id := v_level_id;
  new.term_id := v_term_id;

  return new;
end;
$$;


create trigger trg_materials_sync_academic_context
before insert or update of subject_id
on public.materials
for each row
execute function public.sync_material_academic_context();


-- ============================================================
-- 19. UPDATED_AT HELPER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


create trigger trg_materials_updated_at
before update on public.materials
for each row
execute function public.set_updated_at();


create trigger trg_material_ratings_updated_at
before update on public.material_ratings
for each row
execute function public.set_updated_at();


-- ============================================================
-- 20. SEED LEVELS
-- ============================================================

insert into public.levels (name, sort_order)
values
  ('Level 1', 1),
  ('Level 2', 2),
  ('Level 3', 3),
  ('Level 4', 4);


-- ============================================================
-- 21. SEED TERMS
-- ============================================================

insert into public.terms (level_id, name, sort_order)
select
  l.id,
  'Term 1',
  1
from public.levels l
where l.sort_order between 1 and 4;


insert into public.terms (level_id, name, sort_order)
select
  l.id,
  'Term 2',
  2
from public.levels l
where l.sort_order between 1 and 4;


-- ============================================================
-- 22. END OF INITIAL SCHEMA
-- ============================================================