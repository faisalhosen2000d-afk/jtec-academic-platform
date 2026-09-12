-- JTEC Academic Platform
-- Grant service_role access for automatic student notifications

GRANT SELECT, INSERT, UPDATE
ON TABLE public.notifications
TO service_role;
