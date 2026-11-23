CREATE TABLE IF NOT EXISTS public.question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('previous_year', 'ct')),
  exam_year INTEGER NULL CHECK (exam_year IS NULL OR (exam_year >= 2005 AND exam_year <= 2050)),
  ct_number INTEGER NULL CHECK (ct_number IS NULL OR (ct_number >= 1 AND ct_number <= 4)),
  batch_label TEXT NULL,
  notes TEXT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  share_across_depts BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbank_lookup
  ON public.question_bank_items (term_id, subject_code, question_type, status);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_qbank_pyq_slot
  ON public.question_bank_items (department_id, term_id, subject_id, exam_year)
  WHERE question_type = 'previous_year' AND status IN ('pending', 'approved');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_qbank_ct_slot
  ON public.question_bank_items (department_id, term_id, subject_id, ct_number)
  WHERE question_type = 'ct' AND status IN ('pending', 'approved');

ALTER TABLE public.question_bank_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verified users can read approved questions" ON public.question_bank_items;
CREATE POLICY "Verified users can read approved questions"
  ON public.question_bank_items
  FOR SELECT
  TO authenticated
  USING (status = 'approved');