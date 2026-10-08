alter table public.material_bookmarks enable row level security;

create policy "Students can view their own material bookmarks"
on public.material_bookmarks
for select
to authenticated
using (student_id = auth.uid());

create policy "Students can create their own material bookmarks"
on public.material_bookmarks
for insert
to authenticated
with check (student_id = auth.uid());

create policy "Students can delete their own material bookmarks"
on public.material_bookmarks
for delete
to authenticated
using (student_id = auth.uid());
