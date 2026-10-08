create or replace function public.get_material_rating_stats(p_material_id uuid)
returns table (
  average_rating numeric,
  rating_count integer
)
language sql
security definer
set search_path = public
as $function$
  select
    coalesce(round(avg(r.stars)::numeric, 2), 0) as average_rating,
    count(r.id)::integer as rating_count
  from public.material_ratings r
  inner join public.materials m
    on m.id = r.material_id
  where r.material_id = p_material_id
    and m.status = 'approved';
$function$;

revoke all on function public.get_material_rating_stats(uuid) from public;
grant execute on function public.get_material_rating_stats(uuid) to authenticated;