-- JTEC Academic Platform
-- Migration 0015
-- Grant service_role access required by the secure notice attachment workflow.

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.notice_attachments
TO service_role;