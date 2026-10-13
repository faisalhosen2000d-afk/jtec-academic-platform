-- Enforce one registration code per non-null Student ID.
-- Existing duplicate Student IDs must be resolved before applying.

CREATE UNIQUE INDEX registration_codes_student_id_key
  ON public.registration_codes (student_id)
  WHERE student_id IS NOT NULL;
