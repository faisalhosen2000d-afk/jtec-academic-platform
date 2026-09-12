# JTEC Academic Platform — Architecture Proposal

**Status:** Draft for approval — no code written yet.
**Prepared by:** Lead Architect (AI)
**Scope:** Sections 1–10 requested — technology architecture, folder structure, DB schema, auth, roles/permissions, storage, API/backend, security/RLS, and roadmap.

---

## 1. Final Technology Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Browser / Mobile Web)                                │
│  Next.js App Router + TypeScript + Tailwind + Motion           │
└───────────────┬─────────────────────────────────────────────┘
                │  HTTPS
┌───────────────▼─────────────────────────────────────────────┐
│  Next.js Server Layer (Vercel)                                │
│  - Server Components (data-heavy pages, SSR)                   │
│  - Route Handlers / Server Actions (API layer)                 │
│  - Middleware (session refresh, route protection)              │
│  - Zod-validated input boundaries                               │
└───────────────┬─────────────────────────────────────────────┘
                │  Supabase JS (server + browser clients)
┌───────────────▼─────────────────────────────────────────────┐
│  Supabase Platform                                             │
│  - Auth (JWT, email/password, session mgmt)                    │
│  - PostgreSQL (RLS enforced on every table)                    │
│  - Storage (bucket-level policies)                              │
│  - Edge Functions (email triggers, scoring recompute, cron)     │
└─────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Rationale |
|---|---|
| Next.js Server Components for reads, Server Actions/Route Handlers for writes | Keeps secrets server-side, reduces client bundle, aligns with "never trust client role info" |
| Supabase client split: `server client` (cookies, RLS as user) vs `service-role client` (server-only, used only in trusted server contexts like verification/scoring jobs) | Prevents privilege leakage; service role never reaches the browser |
| RLS as the source of truth, app-layer checks as a second gate | Defense in depth per Section 6 |
| Derived/aggregated data (rankings, contributor scores, view/download counters) computed via scheduled Edge Functions + materialized/summary tables, not computed live on every request | Keeps read paths fast at 500+ students and scales further |
| Zod schemas shared between client forms and server validation | Single source of truth for validation rules (file size, MIME, etc.) |

---

## 2. Project Folder Structure

```
jtec-platform/
├── src/
│   ├── app/
│   │   ├── (public)/                     # Unauthenticated — homepage, notices preview
│   │   │   ├── page.tsx                  # Homepage
│   │   │   ├── notices/
│   │   │   ├── materials/                # Public browse (metadata only until login-gated)
│   │   │   └── login/  register/
│   │   ├── (student)/                    # Student-only route group
│   │   │   ├── dashboard/
│   │   │   ├── materials/[id]/
│   │   │   ├── upload/
│   │   │   ├── bookmarks/
│   │   │   ├── folders/
│   │   │   ├── results/
│   │   │   ├── ranking/
│   │   │   ├── notifications/
│   │   │   └── profile/
│   │   ├── (staff)/                      # Admin / Moderator / Super Admin shared shell
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── materials-review/
│   │   │   │   ├── notices/
│   │   │   │   └── students/
│   │   │   ├── moderator/
│   │   │   │   ├── reports/
│   │   │   │   └── materials-moderation/
│   │   │   └── super-admin/
│   │   │       ├── users/
│   │   │       ├── academic-structure/
│   │   │       ├── registration-codes/
│   │   │       ├── audit-logs/
│   │   │       └── system-settings/
│   │   ├── api/                          # Route Handlers (webhooks, file ops, cron triggers)
│   │   │   ├── materials/
│   │   │   ├── results/
│   │   │   ├── notifications/
│   │   │   └── webhooks/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                           # Design-system primitives (Button, Card, Modal…)
│   │   ├── charts/
│   │   ├── materials/
│   │   ├── dashboard/
│   │   ├── navigation/
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client
│   │   │   ├── server.ts                 # Server (cookie-bound) client
│   │   │   └── service-role.ts           # Server-only privileged client
│   │   ├── validation/                   # Zod schemas (shared client+server)
│   │   ├── permissions/                  # Role/permission helper functions
│   │   ├── scoring/                      # Ranking & contributor scoring logic
│   │   └── email/
│   ├── server/
│   │   ├── actions/                      # Server Actions grouped by domain
│   │   └── services/                     # Domain services (materials, results, notices…)
│   ├── hooks/
│   ├── types/
│   └── middleware.ts
├── supabase/
│   ├── migrations/                       # Numbered SQL migrations
│   ├── functions/                        # Edge Functions (scoring cron, email dispatch)
│   └── seed/                             # Departments, levels, terms, subjects seed data
├── public/
├── docs/
│   ├── architecture/                     # This document + ADRs
│   └── scoring-formula.md                # Documented before implementation (Section 11/26)
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 3–4. Database ER Schema & Tables

### 3.1 Entity groups

```
auth.users (Supabase managed)
   └── profiles ──< student_profile_extra
academic_structure: departments ─< batches ─< levels ─< terms ─< subjects
folders (official) ──< materials ──< material_ratings
                                 ├──< material_comments
                                 ├──< material_bookmarks
                                 ├──< material_reports
                                 ├──< material_view_logs
                                 └──< material_download_logs
personal_folders ──< personal_folder_items
results ──< (verified) contributes to → student_term_gpa → ranking_snapshots
notices ──< notice_attachments
notifications
registration_codes
upload_permission_actions
contributor_score_snapshots
audit_logs
```

### 3.2 Core tables (columns abbreviated — full types finalized at migration time)

**profiles** (1:1 with `auth.users`)
- `id uuid PK references auth.users`
- `role text CHECK IN ('super_admin','admin','moderator','student')`
- `full_name text`
- `student_id text UNIQUE NULL` (students only)
- `email text UNIQUE`
- `avatar_url text NULL`
- `department_id uuid FK → departments NULL`
- `batch_id uuid FK → batches NULL`
- `current_level_id uuid FK → levels NULL`
- `current_term_id uuid FK → terms NULL`
- `is_verified boolean DEFAULT false` (student verification by Super Admin)
- `upload_disabled boolean DEFAULT false`
- `created_at, updated_at timestamptz`

**departments**: `id, name, code, created_at`
**batches**: `id, name (e.g. "2023"), created_at`
**levels**: `id, name ("Level 1"…"Level 4"), sort_order`
**terms**: `id, level_id FK, name ("Term 1"/"Term 2"), sort_order`
**subjects**: `id, department_id FK, level_id FK, term_id FK, subject_code, subject_name, created_by, created_at`
  - Unique constraint: `(department_id, level_id, term_id, subject_code)`
  - Managed via Super Admin UI, never hard-coded (Section 7)

**folders** (official, admin-controlled): `id, department_id, level_id, term_id, subject_id NULL, name, parent_folder_id NULL, created_by, created_at`

**materials**:
- `id, uploader_id FK profiles`
- `folder_id FK folders NULL`, `subject_id FK subjects`
- `department_id, level_id, term_id` (denormalized for fast filtering — kept in sync via trigger or app logic from subject)
- `title, description, topic, keywords text[]`
- `file_path text` (Storage path), `file_type text`, `file_size_bytes bigint`
- `status text CHECK IN ('pending','approved','rejected','private','removed')`
- `reviewed_by FK profiles NULL`, `reviewed_at timestamptz NULL`, `rejection_reason text NULL`
- `views_count int DEFAULT 0`, `downloads_count int DEFAULT 0` (denormalized counters, updated by trigger from log tables)
- `created_at, updated_at`

**material_ratings**: `id, material_id FK, student_id FK, stars smallint CHECK 1-5, created_at, updated_at`
  - Unique: `(material_id, student_id)` — enforces "rate once, edit later" (Section 11)

**material_comments**: `id, material_id FK, author_id FK, content text, is_hidden boolean DEFAULT false (moderation), created_at`

**material_bookmarks**: `id, material_id FK, student_id FK, created_at` — unique `(material_id, student_id)`

**material_reports**: `id, material_id FK, reporter_id FK, reason text, status CHECK IN ('pending','reviewing','resolved','dismissed'), handled_by FK NULL, created_at, resolved_at NULL`

**material_view_logs**: `id, material_id FK, student_id FK, viewed_at timestamptz` — every open is a row (Section 10: 20 opens = 20 views); counters aggregated asynchronously
**material_download_logs**: same shape for downloads

**personal_folders**: `id, student_id FK, name, created_at`
**personal_folder_items**: `id, personal_folder_id FK, material_id FK, added_at` — unique `(personal_folder_id, material_id)`

**registration_codes**: `id, code text UNIQUE, role_scope text, department_id NULL, batch_id NULL, max_uses int, used_count int DEFAULT 0, expires_at NULL, created_by FK, is_active boolean`

**upload_permission_actions**: `id, student_id FK, action text CHECK IN ('disabled','re-enabled'), reason text, actor_id FK, created_at` — satisfies Section 16 auditability

**notices**: `id, title, content text, category text, custom_category_id FK NULL, target_scope text CHECK IN ('all','department','batch','level','term'), target_department_id NULL, target_batch_id NULL, target_level_id NULL, target_term_id NULL, is_pinned boolean, is_archived boolean, created_by FK, created_at`
**notice_categories**: `id, name, created_by, is_custom boolean`
**notice_attachments**: `id, notice_id FK, file_path, file_type, file_size`

**notifications**: `id, recipient_id FK profiles, type text, title, body, link_url NULL, is_read boolean DEFAULT false, created_at`

**results** (student-uploaded official results): `id, student_id FK, term_id FK, file_path text, gpa numeric(3,2) NULL, cgpa numeric(3,2) NULL, status CHECK IN ('pending','verified','rejected'), verified_by FK NULL, verified_at NULL, created_at`
  - Only `status = 'verified'` rows feed ranking/growth (Section 23)

**ranking_snapshots** (materialized, recomputed periodically by Edge Function):
- `id, student_id FK, term_id FK, department_rank int NULL, batch_overall_rank int NULL, computed_cgpa numeric, computed_at timestamptz`
- Rationale: ranking is derived/expensive; snapshotting avoids recomputation on every dashboard load while staying near-real-time via scheduled jobs + on-demand recompute after verification events.

**contributor_score_snapshots**: `id, profile_id FK, period_month date, score numeric, approved_uploads_count, weighted_rating, total_views, total_downloads, computed_at`
  - Backs "Monthly Top 5 Contributors" (Section 26)

**audit_logs**: `id, actor_id FK profiles, action text, target_table text, target_id uuid, previous_state jsonb NULL, new_state jsonb NULL, created_at`

**moderator_escalations** (pending Super Admin approval queue — Section 5): `id, moderator_id FK, action_type text, target_table text, target_id uuid, payload jsonb, status CHECK IN ('pending','approved','denied'), reviewed_by FK NULL, created_at, resolved_at NULL`

### 3.3 Relationship summary

- `profiles.department_id/batch_id/current_level_id/current_term_id` → academic hierarchy FKs
- `materials.subject_id` → `subjects` → cascades filter context (department/level/term)
- All rating/comment/bookmark/report/view/download tables reference `materials.id` and `profiles.id`
- `results.student_id` + `results.term_id` → basis for `ranking_snapshots`
- `notices` target fields are nullable and interpreted based on `target_scope`

A full SQL migration set (with exact types, indexes, and constraints) will be produced in **Phase C**, not in this proposal.

---

## 5. Authentication Architecture

- **Provider:** Supabase Auth (email + password to start; architecture leaves room for OAuth later without redesign).
- **Session handling:** Supabase SSR helpers — HTTP-only cookies, refreshed in Next.js `middleware.ts` on every request.
- **Registration flow:**
  1. Student registers with a valid **registration code** (scoped to department/batch by Super Admin) → account created with `is_verified = false`.
  2. Super Admin (or delegated Admin, per configured permission) verifies the student → `is_verified = true`.
  3. Unverified students have restricted access (can view profile/pending state, cannot upload/rate/comment) — enforced via RLS + middleware.
- **Staff accounts** (Admin/Moderator) are created by Super Admin directly (no public self-registration), with role assigned at creation.
- **Password recovery:** Supabase Auth built-in recovery flow, emailed link — no passwords ever emailed in plaintext (Section 20).
- **Route protection:** `middleware.ts` checks session presence and role for route groups `(student)`, `(staff)`; unauthenticated users redirected to `/login`. This is a UX convenience layer only — **not** the security boundary (RLS is).

---

## 6. Role & Permission Architecture

**Single source of truth:** `profiles.role`, set server-side only, never editable by the user themselves (enforced via RLS `UPDATE` policy that excludes the `role` column from self-updates, or a trigger that rejects role changes from non-privileged actors).

**Permission model:** capability table mapped in `lib/permissions/`, consumed identically by:
1. UI (hide/disable controls — convenience only)
2. Server Actions/Route Handlers (hard gate before any DB write)
3. RLS policies (final enforcement layer)

| Capability | Super Admin | Admin | Moderator | Student |
|---|---|---|---|---|
| Manage admins/moderators/roles | ✅ | ❌ | ❌ | ❌ |
| Verify students | ✅ | Delegable | ❌ | ❌ |
| Manage academic structure (dept/batch/level/term/subject) | ✅ | ❌ | ❌ | ❌ |
| Upload materials | ✅ | ✅ | ❌ (unless escalated) | ✅ |
| Approve/reject materials | ✅ | Within permitted scope | Moderate only (flag/hide) | ❌ |
| Publish notices | ✅ | ✅ | ❌ | ❌ |
| Review reports | ✅ | Scoped | ✅ | ❌ (can only file) |
| Disable student upload permission | ✅ | Delegable, audited | Escalates to Super Admin | ❌ |
| Verify results | ✅ | Delegable | ❌ | ❌ |
| Audit log access | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |

- **Moderator escalation:** any sensitive action attempted by a Moderator beyond their scope writes a row to `moderator_escalations` instead of executing, and the UI reflects "Pending Super Admin Review" (Section 5).
- **Admin scope limits:** Admin permissions for approval/upload-permission actions are **configurable per-Admin** (e.g., scoped to their department) via a `staff_scopes` table (`profile_id, department_id`) rather than hard-coded, so Super Admin can adjust without code changes.

---

## 7. Supabase Storage Architecture

**Buckets (logical separation per Section 32):**

| Bucket | Contents | Public? |
|---|---|---|
| `academic-materials` | Approved & pending material files | Private — signed URLs only, gated by material `status` + role |
| `profile-photos` | User avatars | Public-read (non-sensitive), write restricted to owner |
| `result-documents` | Uploaded official result files | Private — accessible only to owner + verifying staff |
| `notice-attachments` | Notice PDFs/images | Public-read once notice is published; private while draft |

**Path convention (prevents enumeration, aids RLS/policy matching):**
```
academic-materials/{department_id}/{level_id}/{term_id}/{subject_id}/{material_id}/{filename}
result-documents/{student_id}/{term_id}/{result_id}/{filename}
profile-photos/{profile_id}/{filename}
notice-attachments/{notice_id}/{filename}
```

**Storage policies:** mirror RLS logic — e.g., a student can `SELECT` from `academic-materials` only for objects whose path prefix matches an `approved` material they're authorized to see; `INSERT` only into their own pending upload path; staff roles get broader `SELECT`/`UPDATE` per the permission table above.

**File validation (Section 9)** happens **server-side before** the Storage write — Route Handler checks size (≤100MB), MIME type, and extension (block `.xls`/`.xlsx`) using a shared Zod/validator module, independent of any client-side checks.

---

## 8. API / Backend Architecture

- **Pattern:** Next.js Server Actions for form-driven mutations (upload, rate, comment, bookmark, report) co-located with the domain; Route Handlers (`/app/api/...`) for anything needing a stable HTTP contract (webhooks, signed-URL issuance, cron-triggered jobs, potential future external integrations per Section 36).
- **Service layer:** `src/server/services/` encapsulates business logic per domain (`materials.service.ts`, `results.service.ts`, `ranking.service.ts`, `notices.service.ts`) so Server Actions and Route Handlers stay thin and logic is unit-testable.
- **Validation boundary:** every mutating entry point validates input with a Zod schema shared with the client form, then re-checks role/permission via `lib/permissions/`, then executes against Supabase using the **user-scoped** client (RLS applies) — the service-role client is reserved for background jobs (scoring recompute, email dispatch) that must legitimately bypass per-row RLS.
- **Async/derived work:** Edge Functions (scheduled + event-triggered) handle:
  - Recomputing `ranking_snapshots` after a result is verified
  - Recomputing `contributor_score_snapshots` monthly
  - Aggregating `material_view_logs`/`material_download_logs` into `materials.views_count`/`downloads_count` (batched, not per-request, for performance at scale)
  - Dispatching notification + email events

---

## 9. Security & RLS Strategy

- **Defense in depth (Section 6):** frontend hide → server permission check → RLS → storage policy. Any one layer failing must not expose data.
- **RLS baseline per table:**
  - `profiles`: user can `SELECT/UPDATE` only their own non-privileged columns (`role`, `is_verified`, `upload_disabled`, `student_id` excluded from self-update); staff roles get broader `SELECT` per scope.
  - `materials`: public/students can `SELECT` only `status = 'approved'`; uploader can `SELECT` their own regardless of status; staff can `SELECT/UPDATE` per role/scope.
  - `material_ratings`/`bookmarks`: `INSERT/UPDATE` restricted to `student_id = auth.uid()`, one row per `(material_id, student_id)` via unique constraint.
  - `results`: student can `INSERT/SELECT` only their own; only verifying staff can `UPDATE status`.
  - `audit_logs`: insert-only via trusted server context (service role or a `SECURITY DEFINER` function), `SELECT` restricted to Super Admin.
  - `moderator_escalations`: Moderator can `INSERT`/`SELECT` own; only Super Admin can `UPDATE` status.
- **No client ever receives the service-role key** — it lives only in server environment variables (`SUPABASE_SERVICE_ROLE_KEY`), used exclusively inside trusted server code (Edge Functions, select Route Handlers) never bundled to the client.
- **Rate limiting & abuse protection:** applied at the Route Handler/Server Action layer (e.g., upload frequency, report frequency, rating frequency) using a lightweight counter table or edge middleware, to prevent spam independent of RLS.
- **Audit logging:** sensitive mutations (approve/reject, role change, permission disable, result verification, settings change) write to `audit_logs` inside the same transaction/service call, not as an afterthought.

**Environment variables (illustrative — finalized in Phase A/B):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never exposed to client
RESEND_API_KEY=                   # or chosen email provider
NEXT_PUBLIC_SITE_URL=
CRON_SECRET=                      # protects scheduled Edge Function endpoints
```

---

## 10. Development Roadmap (Implementation Order)

Following Section 37's phase list, mapped to concrete deliverables:

| Phase | Deliverable |
|---|---|
| A — Project initialization | Repo scaffold, Next.js + TS + Tailwind + Motion setup, folder structure above |
| B — Supabase setup | Project provisioning, env vars, client wrappers (`browser`/`server`/`service-role`) |
| C — Database migrations | Full SQL migrations for all tables in Section 3, indexes, constraints, seed academic data |
| D — Authentication | Login/register flows, registration codes, session middleware, password recovery |
| E — Role/permission system | `lib/permissions/`, RLS baseline for all tables, staff scopes |
| F — Academic structure | Super Admin CRUD for departments/batches/levels/terms/subjects |
| G — Homepage | Public landing page: hero, search, notices, top contributors, top materials, stats |
| H — Student dashboard | Dashboard shell, widgets (uploads, bookmarks, notices, notifications) |
| I — Materials/file system | Upload flow, Storage integration, validation, metadata, folders |
| J — Verification | Pending → review → approve/reject workflow for materials & results |
| K — Search/filter | Global search across specified fields, filter UI (desktop + mobile) |
| L — Rating/views/downloads/comments/bookmarks | Full interaction layer + weighted scoring model (documented first) |
| M — Notice/notification/email | Notice publishing/targeting, in-app notifications, email triggers |
| N — Results/GPA/CGPA/growth/ranking | Result upload/verification, growth charts, ranking snapshots |
| O — Admin/Moderator/Super Admin panels | Full staff consoles, escalation queue, audit log viewer |
| P — Security review | RLS audit, permission matrix test pass, penetration-style checks |
| Q — Responsive/mobile review | Full mobile UX pass across all modules |
| R — Performance optimization | Pagination, caching, index tuning, image optimization |
| S — Testing | Unit/integration/e2e coverage of critical flows |
| T — Production deployment | Vercel + Supabase production environment, monitoring |

---

## Notes / Flags for Your Confirmation

1. **Weighted scoring formula** (material ranking + contributor ranking) is intentionally **not finalized** here — Section 11 and 26 require it to be "designed carefully and documented before implementation." Recommend a dedicated design pass (e.g., Bayesian-average rating weighted by rater count, combined with normalized views/downloads) before Phase L/N begins.
2. **Admin delegation of verification/upload-permission actions** is modeled as configurable scope rather than a fixed rule, since the spec says Admins can do this "within their permitted authority" without defining exact limits — flagging this as an assumption rather than inventing hard rules.
3. All four departments, four levels, two terms/level are structural (seeded), not hard-coded in UI, per Section 7.

---

**Awaiting your approval before implementation begins (Phase A).**
