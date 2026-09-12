create table if not exists public.administration_account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  requested_role text not null
    check (requested_role in ('admin', 'moderator')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists administration_account_requests_status_idx
  on public.administration_account_requests(status);

create index if not exists administration_account_requests_user_id_idx
  on public.administration_account_requests(user_id);

create index if not exists administration_account_requests_created_at_idx
  on public.administration_account_requests(created_at desc);

alter table public.administration_account_requests enable row level security;

revoke all on public.administration_account_requests from anon, authenticated, public;

grant select, insert, update on public.administration_account_requests to service_role;
