-- Add academic assignment fields required by registration code workflows.
-- Existing rows remain valid because the new columns are initially nullable.

ALTER TABLE public.registration_codes
  ADD COLUMN student_id text,
  ADD COLUMN level_id uuid
    REFERENCES public.levels(id) ON DELETE SET NULL,
  ADD COLUMN term_id uuid
    REFERENCES public.terms(id) ON DELETE SET NULL;

-- Lookup support for student-specific registration codes.
CREATE INDEX idx_registration_codes_student_id
  ON public.registration_codes(student_id);

CREATE INDEX idx_registration_codes_academic_assignment
  ON public.registration_codes(batch_id, level_id, term_id);
