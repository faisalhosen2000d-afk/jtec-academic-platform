-- JTEC Academic Platform
-- Phase M Notice Write Security
-- Migration 0009

GRANT INSERT ON TABLE public.notices TO authenticated;

DROP POLICY IF EXISTS "notices_insert_allowed"
  ON public.notices;

CREATE POLICY "notices_insert_allowed"
  ON public.notices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.is_super_admin()
    )
    OR
    (
      public.is_admin()
      AND target_scope = 'department'
      AND target_department_id IS NOT NULL
      AND public.can_publish_notices(target_department_id)
    )
  );
