BEGIN;

-- ============================================================
-- STUDENT FULL NAME CHANGE HISTORY
-- ============================================================

CREATE TABLE public.student_name_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    profile_id uuid NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    previous_name text NOT NULL,
    new_name text NOT NULL,

    changed_by uuid
        REFERENCES public.profiles(id) ON DELETE SET NULL,

    changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_name_history_profile
    ON public.student_name_history(profile_id, changed_at DESC);

ALTER TABLE public.student_name_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read their own name history"
    ON public.student_name_history
    FOR SELECT
    TO authenticated
    USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Super admins can read all student name history"
    ON public.student_name_history
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

REVOKE ALL ON TABLE public.student_name_history FROM public;
REVOKE ALL ON TABLE public.student_name_history FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_name_history
    FROM authenticated;

GRANT SELECT ON TABLE public.student_name_history TO authenticated;


-- ============================================================
-- SECURE STUDENT FULL NAME UPDATE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_own_student_full_name(
    p_new_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid;
    v_current_name text;
    v_new_name text;
    v_role text;
BEGIN
    v_user_id := auth.uid();
    v_new_name := btrim(p_new_name);

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.'
            USING ERRCODE = '42501';
    END IF;

    IF p_new_name IS NULL OR v_new_name = '' THEN
        RAISE EXCEPTION 'Full name cannot be empty.';
    END IF;

    IF char_length(v_new_name) > 120 THEN
        RAISE EXCEPTION 'Full name cannot exceed 120 characters.';
    END IF;

    SELECT p.full_name, p.role
    INTO v_current_name, v_role
    FROM public.profiles AS p
    WHERE p.id = v_user_id
    FOR UPDATE;

    IF NOT FOUND OR v_role <> 'student' THEN
        RAISE EXCEPTION 'Only students can use this function.'
            USING ERRCODE = '42501';
    END IF;

    IF v_current_name = v_new_name THEN
        RETURN;
    END IF;

    UPDATE public.profiles
    SET
        full_name = v_new_name,
        updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.student_name_history (
        profile_id,
        previous_name,
        new_name,
        changed_by
    )
    VALUES (
        v_user_id,
        v_current_name,
        v_new_name,
        v_user_id
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.update_own_student_full_name(text)
    FROM public;

REVOKE ALL ON FUNCTION public.update_own_student_full_name(text)
    FROM anon;

GRANT EXECUTE ON FUNCTION public.update_own_student_full_name(text)
    TO authenticated;

COMMIT;
