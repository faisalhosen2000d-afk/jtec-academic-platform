-- JTEC Academic Platform
-- Migration 0016
-- Allow authenticated students to read their own notifications.
-- RLS policy still restricts rows to recipient_id = auth.uid().

GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE ON TABLE public.notifications TO authenticated;