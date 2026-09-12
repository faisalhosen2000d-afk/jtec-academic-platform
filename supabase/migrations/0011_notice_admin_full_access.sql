-- JTEC Academic Platform
-- Phase M Notice Write Security Update
-- Migration 0011

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
      OR (
        public.is_admin()
        AND EXISTS (
          SELECT 1
          FROM public.staff_scopes
          WHERE profile_id = auth.uid()
            AND can_publish_notices = true
        )
      )
    )
    AND (
      (
        target_scope = 'all'
        AND target_department_id IS NULL
        AND target_batch_id IS NULL
        AND target_level_id IS NULL
        AND target_term_id IS NULL
      )
      OR
      (
        target_scope = 'department'
        AND target_department_id IS NOT NULL
      )
    )
  );
