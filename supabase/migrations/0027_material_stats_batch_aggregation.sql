create or replace function public.aggregate_material_stats()
returns void
language sql
security definer
set search_path = public
as $function$
  with view_counts as (
    select material_id, count(*)::integer as total
    from public.material_view_logs
    group by material_id
  ),
  download_counts as (
    select material_id, count(*)::integer as total
    from public.material_download_logs
    group by material_id
  )
  update public.materials m
  set
    views_count = coalesce(vc.total, 0),
    downloads_count = coalesce(dc.total, 0),
    updated_at = now()
  from view_counts vc
  full outer join download_counts dc
    on dc.material_id = vc.material_id
  where m.id = coalesce(vc.material_id, dc.material_id);

revoke all on function public.aggregate_material_stats() from public;
revoke all on function public.aggregate_material_stats() from authenticated;
grant execute on function public.aggregate_material_stats() to service_role;
$function$;
