-- JTEC Academic Platform
-- Migration 0014
-- Grant authenticated users SELECT privilege on notices.
-- RLS policies continue to control which rows are visible.

GRANT SELECT ON TABLE public.notices TO authenticated;