-- 0061: Shared Distributed Rate Limiter + Missing Performance Indexes

create table if not exists public.api_rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.api_rate_limits enable row level security;

create index if not exists idx_api_rate_limits_reset_at
  on public.api_rate_limits (reset_at);

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_new_reset timestamptz := v_now + make_interval(secs => greatest(1, p_window_seconds));
  v_count integer;
  v_reset timestamptz;
begin
  -- Opportunistic cleanup of expired keys (~2% of calls)
  if random() < 0.02 then
    delete from public.api_rate_limits
    where reset_at < v_now - interval '1 hour';
  end if;

  insert into public.api_rate_limits (key, count, reset_at)
  values (p_key, 1, v_new_reset)
  on conflict (key) do update
    set
      count = case
        when public.api_rate_limits.reset_at <= v_now then 1
        else public.api_rate_limits.count + 1
      end,
      reset_at = case
        when public.api_rate_limits.reset_at <= v_now then v_new_reset
        else public.api_rate_limits.reset_at
      end
  returning public.api_rate_limits.count, public.api_rate_limits.reset_at
  into v_count, v_reset;

  return query
  select
    (v_count <= p_limit) as allowed,
    v_count as current_count,
    greatest(1, ceil(extract(epoch from (v_reset - v_now)))::integer) as retry_after_seconds;
end;
$$;

grant execute on function public.consume_rate_limit(text, integer, integer)
  to anon, authenticated, service_role;

-- Missing composite indexes for high-traffic queries
create index if not exists idx_question_bank_status_term_code
  on public.question_bank_items (status, term_id, subject_code);

create index if not exists idx_question_bank_status_created
  on public.question_bank_items (status, created_at desc);

create index if not exists idx_materials_status_created
  on public.materials (status, created_at desc);
