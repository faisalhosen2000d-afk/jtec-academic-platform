create or replace function public.approve_administration_account_request(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_request public.administration_account_requests%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'Only Super Admin can approve administration account requests.';
  end if;

  select *
  into v_request
  from public.administration_account_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Administration account request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending administration account requests can be approved.';
  end if;

  update public.profiles
  set is_verified = true
  where id = v_request.user_id
    and role = v_request.requested_role;

  if not found then
    raise exception 'Administration account profile not found.';
  end if;

  update public.administration_account_requests
  set
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_request_id;
end;
$function$;


create or replace function public.reject_administration_account_request(
  p_request_id uuid,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_request public.administration_account_requests%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'Only Super Admin can reject administration account requests.';
  end if;

  select *
  into v_request
  from public.administration_account_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Administration account request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending administration account requests can be rejected.';
  end if;

  update public.administration_account_requests
  set
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = nullif(trim(p_rejection_reason), '')
  where id = p_request_id;
end;
$function$;


revoke all on function public.approve_administration_account_request(uuid) from public, anon, authenticated;
revoke all on function public.reject_administration_account_request(uuid, text) from public, anon, authenticated;

grant execute on function public.approve_administration_account_request(uuid) to authenticated;
grant execute on function public.reject_administration_account_request(uuid, text) to authenticated;
