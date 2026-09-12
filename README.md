# JTEC Academic Platform

Academic platform for Jhenaidah Textile Engineering College.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Motion + Supabase (PostgreSQL, Auth, Storage).
No Express, no standalone Node server, no prior HTML prototype code is part of this project.

This repository currently contains **Phase A — Project Initialization** only. No database
migrations, authentication logic, or feature code has been implemented yet.

---

## Prerequisites

- Node.js **20.9+**
- npm (bundled with Node) — or pnpm/yarn if you prefer, adjust commands accordingly
- [Docker](https://www.docker.com/) (required by the Supabase CLI to run Supabase locally)
- Supabase CLI (installed as a dev dependency — see below)

---

## 1. Install dependencies

```bash
npm install
```

## 2. Start Supabase locally

```bash
npx supabase start
```

This spins up local Postgres, Auth, Storage, and Studio in Docker. On first run it prints:

```
API URL: http://127.0.0.1:54321
anon key: ey...
service_role key: ey...
```

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with the values printed by `supabase start`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=<any long random string>
```

Never commit `.env.local`. It's already covered by `.gitignore`.

## 4. Run the app locally

```bash
npm run dev
```

Visit **http://localhost:3000** — you should see the Phase A placeholder homepage confirming
the scaffold builds and runs. Supabase Studio (local DB admin UI) is available at
**http://127.0.0.1:54323**.

## 5. Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run the Next.js dev server locally |
| `npm run build` | Production build (build-only — no deploy) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run format` | Prettier, with Tailwind class sorting |
| `npm run supabase:start` / `supabase:stop` | Start/stop local Supabase stack |
| `npm run supabase:migrate` | Apply migrations to the local DB (used from Phase C onward) |
| `npm run supabase:reset` | Reset local DB and re-run migrations + seed (used from Phase C onward) |

---

## Project status

- [x] **Phase A** — Project initialization (this commit)
- [ ] Phase B — Supabase setup
- [ ] Phase C — Database migrations
- [ ] Phase D — Authentication
- [ ] Phase E — Role/permission system
- [ ] Phase F — Academic structure
- [ ] Phase G — Homepage
- [ ] Phase H — Student dashboard
- [ ] Phase I — Materials/file system
- [ ] Phase J — Verification
- [ ] Phase K — Search/filter
- [ ] Phase L — Rating/views/downloads/comments/bookmarks
- [ ] Phase M — Notice/notification/email
- [ ] Phase N — Results/GPA/CGPA/growth/ranking
- [ ] Phase O — Admin/Moderator/Super Admin panels
- [ ] Phase P — Security review
- [ ] Phase Q — Responsive/mobile review
- [ ] Phase R — Performance optimization
- [ ] Phase S — Testing
- [ ] Phase T — Production deployment (Vercel — intentionally not configured yet)

Full architecture reference: [`docs/architecture/`](./docs/architecture).

---

## Folder structure (Phase A scaffold)

```
src/
├── app/
│   ├── (public)/       # Unauthenticated routes — homepage, notices, materials browse, login/register
│   ├── (student)/      # Student-only route group
│   ├── (staff)/        # Admin / Moderator / Super Admin route group
│   └── api/            # Route Handlers (webhooks, cron-triggered jobs)
├── components/         # ui / charts / materials / dashboard / navigation / shared
├── lib/
│   ├── supabase/       # client.ts (browser), server.ts (SSR), service-role.ts (privileged, server-only)
│   ├── validation/      # Zod schemas shared client+server
│   ├── permissions/     # Role/scope permission helpers
│   ├── scoring/         # Ranking & contributor scoring logic (formula TBD — separate design task)
│   └── email/
├── server/
│   ├── actions/         # Server Actions grouped by domain
│   └── services/        # Domain services (materials, results, notices…)
├── hooks/
├── types/               # Includes generated `database.ts` (Phase C)
└── middleware.ts         # Session refresh only — NOT the authorization boundary (RLS is)

supabase/
├── migrations/           # SQL migrations (Phase C)
├── functions/            # Edge Functions — scoring recompute, email dispatch (Phase M/N)
└── seed/                 # Departments, levels, terms, subjects seed data (Phase C/F)
```

## Security note

This scaffold intentionally ships **no business logic**. Per the approved architecture, every
sensitive action will be protected by three independent layers once implemented: server-side
permission checks, PostgreSQL Row Level Security, and Supabase Storage policies. The
`service-role.ts` client bypasses RLS and must only ever be used server-side, with an explicit
permission check at every call site.
