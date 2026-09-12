-- JTEC Academic Platform
-- Migration 0025: Material statistics aggregation checkpoint
--
-- Keeps the last successfully processed log position for each
-- material-statistics stream. Raw material logs remain unchanged.

create table public.material_stats_aggregation_state (
  stream text primary key
    check (stream in ('views', 'downloads')),

  last_processed_at timestamptz not null,
  last_processed_id uuid not null,

  updated_at timestamptz not null default now()
);

insert into public.material_stats_aggregation_state (
  stream,
  last_processed_at,
  last_processed_id
)
values
  ('views', '1970-01-01 00:00:00+00'::timestamptz, '00000000-0000-0000-0000-000000000000'),
  ('downloads', '1970-01-01 00:00:00+00'::timestamptz, '00000000-0000-0000-0000-000000000000');

revoke all on table public.material_stats_aggregation_state from public;
revoke all on table public.material_stats_aggregation_state from authenticated;
grant select, insert, update, delete
  on table public.material_stats_aggregation_state
  to service_role;