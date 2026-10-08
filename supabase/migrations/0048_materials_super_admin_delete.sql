create policy "Super admin can delete approved materials"
  on public.materials
  for delete
  to authenticated
  using (
    public.is_super_admin()
    and status = 'approved'
  );
