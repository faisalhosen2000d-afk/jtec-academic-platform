CREATE OR REPLACE FUNCTION public.get_student_login_email(p_student_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  p_student_id := nullif(trim(p_student_id), '');

  IF p_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email
    INTO v_email
  FROM public.profiles
  WHERE student_id = p_student_id
    AND role = 'student'
  LIMIT 1;

  RETURN v_email;
END;
$$;
REVOKE ALL ON FUNCTION public.get_student_login_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_login_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_student_login_email(text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.get_student_login_email(text) TO service_role;
