-- JTEC Academic Platform
-- Migration 0018: Allow students to delete their own notifications

GRANT DELETE ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_delete_own"
  ON public.notifications;

CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    recipient_id = auth.uid()
  );
