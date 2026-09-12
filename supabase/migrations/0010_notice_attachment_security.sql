-- JTEC Academic Platform
-- Phase M Notice Attachment Security
-- Migration 0010

-- Notice attachments must be uploaded through the secured
-- server-side notice publishing workflow.
DROP POLICY IF EXISTS "notice_attachments_upload_staff"
  ON storage.objects;

-- The old attachment visibility policy supported the previous
-- target_scope model (batch/level/term as independent scopes).
-- Replace it with the approved Department + optional filters model.
DROP POLICY IF EXISTS "notice_attachments_select_visible"
  ON storage.objects;

CREATE POLICY "notice_attachments_select_visible"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'notice-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.notice_attachments na
      JOIN public.notices n
        ON n.id = na.notice_id
      JOIN public.profiles p
        ON p.id = auth.uid()
      WHERE
        n.is_archived = false
        AND na.file_path = objects.name
        AND (
          n.target_scope = 'all'
          OR (
            n.target_scope = 'department'
            AND p.department_id = n.target_department_id
            AND (
              n.target_batch_id IS NULL
              OR p.batch_id = n.target_batch_id
            )
            AND (
              n.target_level_id IS NULL
              OR p.current_level_id = n.target_level_id
            )
            AND (
              n.target_term_id IS NULL
              OR p.current_term_id = n.target_term_id
            )
          )
        )
    )
  );
