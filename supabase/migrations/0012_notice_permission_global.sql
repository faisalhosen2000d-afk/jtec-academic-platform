-- JTEC Academic Platform
-- Phase M Notice Permission Update
-- Migration 0012
--
-- Publish Notices is a global Admin capability.
-- Department scope does not restrict notice publishing.

CREATE OR REPLACE FUNCTION public.can_publish_notices(
  p_department_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
  SELECT
    public.is_super_admin()
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.staff_scopes
        WHERE profile_id = auth.uid()
          AND can_publish_notices = true
      )
    );
$function$;

GRANT EXECUTE ON FUNCTION public.can_publish_notices(uuid)
TO authenticated;
