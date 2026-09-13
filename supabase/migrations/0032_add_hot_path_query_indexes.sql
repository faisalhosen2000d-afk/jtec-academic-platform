-- Keep the most frequently visited student lists responsive as the number of
-- materials, notices, and notifications grows. These indexes mirror the
-- existing filters and sort orders; they do not change RLS or query results.

create index if not exists idx_materials_approved_created_at
  on public.materials (created_at desc)
  where status = 'approved';

create index if not exists idx_notices_active_pinned_created_at
  on public.notices (is_pinned desc, created_at desc)
  where is_archived = false;

create index if not exists idx_notifications_recipient_created_at
  on public.notifications (recipient_id, created_at desc);
