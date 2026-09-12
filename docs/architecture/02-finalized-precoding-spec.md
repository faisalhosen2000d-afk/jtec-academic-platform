# JTEC Academic Platform — Finalized Pre-Coding Architecture Specification

**Status:** Finalized baseline, pending sign-off on the "Open Decisions" list at the end.
**Supersedes:** Any prior Express/server.js/plain-HTML prototype — that stack is explicitly excluded from the production architecture. Next.js + TypeScript + Tailwind + Motion + Supabase is final.

---

## 1. Confirmed Final Stack

- **Frontend/Backend runtime:** Next.js (App Router) + TypeScript, deployed on Vercel.
- **Styling/animation:** Tailwind CSS + Motion.
- **Data/Auth/Storage:** Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- **No Express server, no standalone Node server, no plain HTML/CSS/JS prototype code carries forward.** Any earlier prototype is reference-only for requirements, not for code reuse.

---

## 2. Finalized Database Schema (DDL-level detail)

Notation: `PK` primary key, `FK→table` foreign key, `NN` not null, `NULL` nullable, `UQ` unique, `CK` check constraint. Deletion behavior is specified per FK.

### 2.1 `profiles`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, FK→auth.users(id) ON DELETE CASCADE |
| role | text | NN, CK IN ('super_admin','admin','moderator','student'), default 'student' |
| full_name | text | NN |
| student_id | text | NULL, UQ (partial: only enforced when role='student') |
| email | text | NN, UQ |
| avatar_url | text | NULL |
| department_id | uuid | NULL, FK→departments(id) ON DELETE SET NULL |
| batch_id | uuid | NULL, FK→batches(id) ON DELETE SET NULL |
| current_level_id | uuid | NULL, FK→levels(id) ON DELETE SET NULL |
| current_term_id | uuid | NULL, FK→terms(id) ON DELETE SET NULL |
| is_verified | boolean | NN, default false |
| upload_disabled | boolean | NN, default false |
| created_at | timestamptz | NN, default now() |
| updated_at | timestamptz | NN, default now() |

Index: `(role)`, `(department_id, batch_id)`, `(student_id)`.
Update behavior: `role`, `student_id`, `department_id`, `batch_id`, `current_level_id`, `current_term_id`, `is_verified`, `upload_disabled` are **server-controlled only** (RLS blocks self-update of these columns; see §7).

### 2.2 Academic hierarchy

**departments**: `id PK, name text NN UQ, code text NN UQ, created_at`
**batches**: `id PK, name text NN UQ (e.g. "2023"), created_at`
**levels**: `id PK, name text NN, sort_order smallint NN UQ` — seeded exactly 4 rows (Level 1–4)
**terms**: `id PK, level_id FK→levels ON DELETE CASCADE, name text NN, sort_order smallint NN, UQ(level_id, sort_order)` — seeded exactly 2 per level (Term 1–2)
**subjects**: `id PK, department_id FK→departments ON DELETE CASCADE, level_id FK→levels ON DELETE RESTRICT, term_id FK→terms ON DELETE RESTRICT, subject_code text NN, subject_name text NN, created_by FK→profiles ON DELETE SET NULL, created_at`
- `UQ(department_id, level_id, term_id, subject_code)`
- Index: `(department_id, level_id, term_id)` for fast filter queries.
- **Seed data source:** provided subject dataset, loaded via `supabase/seed/subjects.sql` (or CSV import) — never hard-coded in components. UI reads from this table exclusively (Section 7/39 compliance).

### 2.3 Folders (official vs personal — clearly separated per requirement 5)

**folders** (official, admin-controlled):
`id PK, department_id FK→departments ON DELETE CASCADE, level_id FK→levels ON DELETE CASCADE, term_id FK→terms ON DELETE CASCADE NULL, subject_id FK→subjects ON DELETE CASCADE NULL, name text NN, parent_folder_id FK→folders(id) ON DELETE CASCADE NULL, created_by FK→profiles ON DELETE SET NULL, created_at`
- Only `super_admin`/`admin` (with scope) can `INSERT/UPDATE/DELETE`. Students have **no write access whatsoever** to this table (enforced by RLS — no student-role policy exists for INSERT/UPDATE/DELETE).

**personal_folders** (student-owned, fully separate table/entity):
`id PK, student_id FK→profiles ON DELETE CASCADE, name text NN, created_at`
- `UQ(student_id, name)` — no duplicate personal folder names per student.

**personal_folder_items**:
`id PK, personal_folder_id FK→personal_folders ON DELETE CASCADE, material_id FK→materials ON DELETE CASCADE, added_at`
- `UQ(personal_folder_id, material_id)`

This gives a hard structural separation: official folders live under `folders` and are only ever referenced by `materials.folder_id`; personal organization lives entirely under `personal_folders`/`personal_folder_items` and never touches the official tree.

### 2.4 `materials`
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| uploader_id | uuid | NN, FK→profiles ON DELETE CASCADE |
| folder_id | uuid | NULL, FK→folders ON DELETE SET NULL |
| subject_id | uuid | NN, FK→subjects ON DELETE RESTRICT |
| department_id | uuid | NN, FK→departments ON DELETE RESTRICT (denormalized, trigger-synced from subject) |
| level_id | uuid | NN, FK→levels ON DELETE RESTRICT (denormalized) |
| term_id | uuid | NN, FK→terms ON DELETE RESTRICT (denormalized) |
| title | text | NN |
| description | text | NULL |
| topic | text | NULL |
| keywords | text[] | NULL |
| file_path | text | NN |
| file_type | text | NN |
| file_size_bytes | bigint | NN, CK (file_size_bytes <= 104857600) |
| status | text | NN, CK IN ('pending','approved','rejected','private','removed'), default 'pending' |
| reviewed_by | uuid | NULL, FK→profiles ON DELETE SET NULL |
| reviewed_at | timestamptz | NULL |
| rejection_reason | text | NULL |
| views_count | int | NN, default 0 |
| downloads_count | int | NN, default 0 |
| created_at / updated_at | timestamptz | NN, default now() |

Indexes: `(status)`, `(department_id, level_id, term_id, subject_id)`, `(uploader_id)`, GIN index on `keywords`, full-text search index (generated `tsvector` column) on `title, description, topic, keywords`.
Trigger: `BEFORE INSERT/UPDATE` syncs `department_id/level_id/term_id` from `subject_id` to keep denormalized filter columns correct.

### 2.5 Interaction tables

**material_ratings**: `id PK, material_id FK→materials ON DELETE CASCADE, student_id FK→profiles ON DELETE CASCADE, stars smallint NN CK (stars BETWEEN 1 AND 5), created_at, updated_at`
- `UQ(material_id, student_id)` — enforces one rating per student per file; edits go through `UPDATE`, never a new row.

**material_comments**: `id PK, material_id FK→materials ON DELETE CASCADE, author_id FK→profiles ON DELETE CASCADE, content text NN, is_hidden boolean NN default false, created_at`

**material_bookmarks**: `id PK, material_id FK→materials ON DELETE CASCADE, student_id FK→profiles ON DELETE CASCADE, created_at`
- `UQ(material_id, student_id)`

**material_reports**: `id PK, material_id FK→materials ON DELETE CASCADE, reporter_id FK→profiles ON DELETE CASCADE, reason text NN, status text NN CK IN ('pending','reviewing','resolved','dismissed') default 'pending', handled_by FK→profiles ON DELETE SET NULL NULL, created_at, resolved_at NULL`

**material_view_logs**: `id PK, material_id FK→materials ON DELETE CASCADE, student_id FK→profiles ON DELETE CASCADE, viewed_at timestamptz NN default now()`
- Index `(material_id, viewed_at)`. Every open = new row (per spec: 20 opens = 20 views, no dedup).

**material_download_logs**: same shape as view logs, indexed the same way.

Both log tables feed `materials.views_count`/`downloads_count` via a batched Edge Function (not a per-row trigger), to avoid write amplification at scale.

### 2.6 Registration & permission audit

**registration_codes**: `id PK, code text NN UQ, role_scope text NN CK IN ('student'), department_id FK→departments ON DELETE SET NULL NULL, batch_id FK→batches ON DELETE SET NULL NULL, max_uses int NN CK (max_uses > 0), used_count int NN default 0 CK (used_count <= max_uses), expires_at timestamptz NULL, created_by FK→profiles ON DELETE SET NULL, is_active boolean NN default true, created_at`
- Staff accounts are **never** created via registration code (§6 below) — `role_scope` is constrained to `'student'` only.

**upload_permission_actions**: `id PK, student_id FK→profiles ON DELETE CASCADE, action text NN CK IN ('disabled','re-enabled'), reason text NN, actor_id FK→profiles ON DELETE SET NULL, created_at`

**moderator_escalations**: `id PK, moderator_id FK→profiles ON DELETE CASCADE, action_type text NN, target_table text NN, target_id uuid NN, payload jsonb NN, status text NN CK IN ('pending','approved','denied') default 'pending', reviewed_by FK→profiles ON DELETE SET NULL NULL, created_at, resolved_at NULL`

### 2.7 Notices & notifications

**notice_categories**: `id PK, name text NN UQ, is_custom boolean NN default false, created_by FK→profiles ON DELETE SET NULL, created_at`

**notices**: `id PK, title text NN, content text NN, category_id FK→notice_categories ON DELETE SET NULL NULL, target_scope text NN CK IN ('all','department','batch','level','term'), target_department_id FK→departments ON DELETE SET NULL NULL, target_batch_id FK→batches ON DELETE SET NULL NULL, target_level_id FK→levels ON DELETE SET NULL NULL, target_term_id FK→terms ON DELETE SET NULL NULL, is_pinned boolean NN default false, is_archived boolean NN default false, created_by FK→profiles ON DELETE SET NULL, created_at`
- CK: target_* columns must be non-null only when `target_scope` matches (enforced via CHECK using a validating expression or trigger — finalized at migration time).

**notice_attachments**: `id PK, notice_id FK→notices ON DELETE CASCADE, file_path text NN, file_type text NN, file_size_bytes bigint NN`

**notifications**: `id PK, recipient_id FK→profiles ON DELETE CASCADE, type text NN, title text NN, body text NN, link_url text NULL, is_read boolean NN default false, created_at`
- Index `(recipient_id, is_read, created_at)`.

### 2.8 Results, GPA/CGPA, ranking

**results**: `id PK, student_id FK→profiles ON DELETE CASCADE, term_id FK→terms ON DELETE RESTRICT, file_path text NN, gpa numeric(3,2) NULL CK (gpa BETWEEN 0 AND 4), cgpa numeric(3,2) NULL CK (cgpa BETWEEN 0 AND 4), status text NN CK IN ('pending','verified','rejected') default 'pending', verified_by FK→profiles ON DELETE SET NULL NULL, verified_at timestamptz NULL, created_at`
- `UQ(student_id, term_id)` — one official result record per student per term (re-upload replaces via `UPDATE`, keeping an audit trail through `audit_logs`).
- **Hard rule (requirement 10):** `gpa`/`cgpa` are entered only from the verified document at verification time by authorized staff; there is **no** computation path from subject-level marks anywhere in the schema — no `subject_marks` table exists by design.

**ranking_snapshots**: `id PK, student_id FK→profiles ON DELETE CASCADE, term_id FK→terms ON DELETE CASCADE, department_rank int NULL, batch_overall_rank int NULL, computed_cgpa numeric(3,2) NN, computed_at timestamptz NN default now()`
- `UQ(student_id, term_id)`.
- **Hard rule (requirement 11):** the recompute job that populates this table selects **only** `results.status = 'verified'` rows — unverified/pending/rejected results are excluded from every ranking query at the source, not filtered in the UI.

**contributor_score_snapshots**: `id PK, profile_id FK→profiles ON DELETE CASCADE, period_month date NN, score numeric NN, approved_uploads_count int NN, weighted_rating numeric NN, total_views int NN, total_downloads int NN, computed_at timestamptz NN default now()`
- `UQ(profile_id, period_month)`.

### 2.9 Audit

**audit_logs**: `id PK, actor_id FK→profiles ON DELETE SET NULL NULL, action text NN, target_table text NN, target_id uuid NN, previous_state jsonb NULL, new_state jsonb NULL, created_at timestamptz NN default now()`
- Insert-only at the application boundary — no `UPDATE`/`DELETE` policy exists for any role, including Super Admin, preserving log integrity.

---

## 3. Finalized Academic Hierarchy & Seeding Strategy

- Fixed structural levels (`Department → Batch → Level → Term → Subject`) are represented as **rows**, not enum types, so Super Admin can extend/manage them later without a schema change (per §7 of the master spec).
- Seed migration order: `departments` (4 fixed rows: Yarn, Fabric, Wet Process, Apparel Engineering) → `levels` (4 rows) → `terms` (2 per level = 8 rows) → `subjects` (from the provided dataset, loaded via a seed script that validates `(department, level, term, subject_code)` uniqueness before insert).
- `batches` are **not** fixed — new batches are created operationally as new student cohorts enroll; managed via Super Admin UI.
- No department/level/term/subject name or code is ever hard-coded into a React component — all such UI (filters, dropdowns, forms) queries these tables at request time (with caching where safe).
- If provided subject data has ambiguous/missing (department, level, term, code) combinations, the seed script **flags and halts** rather than guessing (requirement 39 preserved).

---

## 4. Finalized Authentication & Registration-Code Behavior

- **Students:** self-register via `/register`, must supply a valid, active, non-expired **registration code** scoped to a department/batch. On success: Supabase Auth user created + `profiles` row created with `role='student'`, `is_verified=false`, `department_id`/`batch_id` taken from the code. Registration code `used_count` increments atomically (DB function to avoid race conditions past `max_uses`).
- **Verification gate:** until `is_verified=true` (set only by Super Admin, or delegated Admin with the `can_verify_students` scope — see §5), the student account can log in and view their own profile/pending status only. RLS blocks rating, commenting, bookmarking, uploading, and viewing full material content for unverified accounts.
- **Staff accounts (Admin/Moderator):** never self-registered. Created exclusively by Super Admin through a dedicated staff-creation flow (Supabase Auth admin API, server-side only, using the service-role client) with `role` and `staff_scopes` assigned at creation time.
- **Super Admin account(s):** provisioned manually/out-of-band during initial setup (seed script or one-time secured setup route), not through any public flow.
- **Password recovery:** Supabase Auth's native recovery-link flow; no password is ever transmitted by email (requirement matches master spec §20).
- **Session handling:** Supabase SSR cookie-based session, refreshed in `middleware.ts`; `middleware.ts` performs coarse route-group protection only — it is **not** the authorization boundary (RLS is, per requirement 12).

---

## 5. Finalized Role/Permission Matrix & Scope Behavior

Baseline matrix (unchanged from proposal, now finalized as binding):

| Capability | Super Admin | Admin | Moderator | Student |
|---|---|---|---|---|
| Manage roles / create staff accounts | ✅ | ❌ | ❌ | ❌ |
| Manage academic structure (dept/batch/level/term/subject) | ✅ | ❌ | ❌ | ❌ |
| Verify students | ✅ | Only if `can_verify_students=true` in `staff_scopes` | ❌ | ❌ |
| Upload materials | ✅ | ✅ | ❌ (must escalate) | ✅ (if `upload_disabled=false` and `is_verified=true`) |
| Approve/reject materials | ✅ | Only within `staff_scopes.department_id` | Can hide/flag only, cannot approve/reject | ❌ |
| Publish notices | ✅ | ✅ | ❌ | ❌ |
| Review reports | ✅ | Within scope | ✅ | Can file only |
| Disable/re-enable student upload permission | ✅ | Only if `can_manage_upload_permission=true` | Writes to `moderator_escalations` instead | ❌ |
| Verify results (GPA/CGPA) | ✅ | Only if `can_verify_results=true` | ❌ | ❌ |
| Audit log access | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |

**`staff_scopes` table (new, finalizes Admin/Moderator scope behavior):**
`id PK, profile_id FK→profiles ON DELETE CASCADE, department_id FK→departments ON DELETE CASCADE NULL, can_verify_students boolean NN default false, can_verify_results boolean NN default false, can_manage_upload_permission boolean NN default false, can_approve_materials boolean NN default true, granted_by FK→profiles ON DELETE SET NULL, created_at`
- `UQ(profile_id, department_id)` — an Admin can hold scoped permissions per department if they support more than one.
- Only Super Admin can `INSERT/UPDATE/DELETE` this table.

**Moderator escalation behavior (finalized):** any Moderator action that maps to a capability not in their fixed set (e.g., disabling upload permission, approving/rejecting outright, verifying results) is intercepted at the service layer **before** any table write and instead inserts a row into `moderator_escalations` with `status='pending'`; the UI shows "Escalated — Pending Super Admin Review" rather than a failure. Super Admin resolves via `approved`/`denied`, and approval triggers the original action server-side.

---

## 6. Finalized Supabase Storage Bucket Policies

| Bucket | Read policy | Write policy | Notes |
|---|---|---|---|
| `academic-materials` | Owner (uploader) always; any authenticated **verified** student/staff only when linked `materials.status = 'approved'`; staff with matching scope can read any status | Owner can `INSERT` only into their own pending path; only staff with `can_approve_materials` can change downstream visibility (status change, not a storage write) | Signed URLs issued server-side per request, short-lived, never public |
| `profile-photos` | Public read | Owner-only write, size-limited (enforced server-side before upload) | Non-sensitive, safe to expose publicly for avatars |
| `result-documents` | Owner (student) always; staff with `can_verify_results=true` | Owner-only `INSERT`; no public read ever | Contains sensitive academic documents |
| `notice-attachments` | Public read once parent `notices.is_archived = false` and notice is published; private while staff draft in progress | Only `super_admin`/`admin` with notice-publish rights | — |

**Path convention (also used for policy matching):**
```
academic-materials/{department_id}/{level_id}/{term_id}/{subject_id}/{material_id}/{filename}
result-documents/{student_id}/{term_id}/{result_id}/{filename}
profile-photos/{profile_id}/{filename}
notice-attachments/{notice_id}/{filename}
```
Storage policies parse the path prefix and join against the corresponding table's `status`/ownership to authorize — mirroring RLS logic, never trusting the client-supplied path alone.

**Server-side validation (before any Storage write, independent of client checks):** file size ≤ 100MB, MIME/extension whitelist, `.xls`/`.xlsx` explicitly blocked, virus/type sniffing at the byte level (not just extension trust).

---

## 7. Finalized RLS / Security Enforcement Summary

Every table above gets an RLS policy set following this pattern (exact SQL finalized in Phase C migrations):

1. **Self-scoped read/write** for personal data (`profiles` self-row, `personal_folders`, `material_ratings`, `bookmarks`, `results` own rows).
2. **Status-gated read** for public-facing content (`materials` where `status='approved'`, `notices` where published+not archived).
3. **Role-gated write** for privileged actions (approve/reject, verify, publish, manage structure) — policy checks `profiles.role` (and `staff_scopes` where applicable) of `auth.uid()`, joined via a `SECURITY DEFINER` helper function (e.g., `is_staff_with_scope(department_id, capability)`) to avoid recursive RLS lookups.
4. **No client-writable privileged columns** — `role`, `is_verified`, `upload_disabled`, `student_id`, ranking/score snapshot tables, and `audit_logs` have no user-facing `INSERT`/`UPDATE` policy at all; they're written only by server-side service-role logic or `SECURITY DEFINER` functions triggered through vetted Server Actions.
5. **Three-layer enforcement confirmed for every sensitive action** (requirement 12): UI hides the control → Server Action/Route Handler re-checks role/scope before calling Supabase → RLS policy independently re-checks at the database → Storage policy re-checks at the file layer. Any layer alone failing cannot leak data or allow unauthorized writes.

---

## 8. Confirmed Exclusions (per requirement 9)

The rating/contributor weighted scoring formula remains **explicitly undesigned** at this stage. `material_ratings`, `material_view_logs`, `material_download_logs`, and `contributor_score_snapshots` capture all raw inputs needed for it, but the formula itself is a separate design task to be completed and documented (`docs/scoring-formula.md`) before Phase L/N implementation begins.

---

## 9. Open Decisions Requiring Your Approval Before Coding

1. **Batch creation workflow:** Should new batches be created manually by Super Admin ahead of each admission cycle, or auto-created the first time a registration code references a not-yet-existing batch name? (Recommendation: manual creation only, to avoid typo'd batch proliferation.)
2. **Result re-upload behavior:** If a student uploads a corrected result for a term that already has a `verified` row, should the new upload overwrite (moving status back to `pending`, requiring re-verification) or be rejected outright until staff manually intervenes? (Recommendation: overwrite → back to `pending`, old verified values retained in `audit_logs` for traceability.)
3. **Admin department scope for material approval:** Confirm whether an Admin's `staff_scopes.department_id` should restrict them to approving materials *only* in their own department, or whether cross-department approval should be possible for certain trusted Admins. (Recommendation: strictly own department by default, overridable per-row by Super Admin only.)
4. **Notice target-scope validation:** Confirm the exact combinations allowed for `target_scope='level'`/`'term'` — e.g., does targeting a term imply a specific department+batch, or is it college-wide "all Level 2 Term 1 students regardless of department"? This affects the CHECK/trigger logic on `notices`.
5. **Ranking recompute cadence:** Confirm whether `ranking_snapshots` should recompute immediately on each result verification (event-triggered) versus on a fixed daily/weekly schedule (cron) — affects Edge Function design in Phase N.
6. **Comment moderation authority:** Confirm whether Moderators can hide/unhide comments directly or must also escalate comment moderation like other sensitive actions.

Once these are resolved, Phase A (project initialization) can begin.
