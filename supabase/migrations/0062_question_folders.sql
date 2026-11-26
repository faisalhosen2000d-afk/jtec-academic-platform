CREATE TABLE IF NOT EXISTS public.question_bank_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('previous_year', 'ct')),
  parent_id UUID NULL REFERENCES public.question_bank_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 80),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.question_bank_items
  ADD COLUMN IF NOT EXISTS folder_id UUID NULL
  REFERENCES public.question_bank_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qbank_folders_lookup
  ON public.question_bank_folders (term_id, subject_code, question_type, parent_id);

CREATE INDEX IF NOT EXISTS idx_qbank_items_folder
  ON public.question_bank_items (folder_id);

ALTER TABLE public.question_bank_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verified users can read question folders" ON public.question_bank_folders;
CREATE POLICY "Verified users can read question folders"
  ON public.question_bank_folders
  FOR SELECT
  TO authenticated
  USING (true);

GRANT ALL ON TABLE public.question_bank_folders TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_bank_folders TO authenticated;
