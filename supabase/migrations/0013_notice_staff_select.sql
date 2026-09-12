-- JTEC Academic Platform
-- Migration 0013
-- Allow authorized notice managers to view notices they manage.

DROP POLICY IF EXISTS "notices_select_staff_management"
  ON public.notices;

CREATE POLICY "notices_select_staff_management"
  ON public.notices
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.staff_scopes
        WHERE profile_id = auth.uid()
          AND can_publish_notices = true
      )
    )
  );