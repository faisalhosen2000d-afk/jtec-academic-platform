import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type StudentAcademicProfile = {
  department_id: string;
  current_level_id: string;
  current_term_id: string;
};

type AcademicTerm = {
  id: string;
  level_id: string;
  sort_order: number;
  level:
    | {
        sort_order: number;
      }
    | {
        sort_order: number;
      }[]
    | null;
};

type CurriculumSubject = {
  subject_code: string;
  level_id: string;
};

type MaterialWithSubject = {
  subject:
    | {
        subject_code: string;
        level_id: string;
      }
    | {
        subject_code: string;
        level_id: string;
      }[]
    | null;
};

export async function getStudentVisibleMaterialsCount(
  supabase: SupabaseClient,
  profile: StudentAcademicProfile,
): Promise<number> {
  const { data: academicTerms, error: academicTermsError } = await supabase
    .from("terms")
    .select(`
      id,
      level_id,
      sort_order,
      level:levels (
        sort_order
      )
    `)
    .order("sort_order", { ascending: true });

  if (academicTermsError) {
    throw new Error(
      `Student materials terms loading failed: ${academicTermsError.message}`,
    );
  }

  const currentTerm = (academicTerms ?? []).find(
    (term) => term.id === profile.current_term_id,
  );

  const currentLevelOrder = currentTerm?.level;
  const currentLevelSortOrderFromObject = currentLevelOrder as unknown as { sort_order: number } | null;
  const currentLevelSortOrder = Array.isArray(currentLevelOrder)
    ? currentLevelOrder[0]?.sort_order
    : currentLevelSortOrderFromObject?.sort_order;
  if (currentLevelSortOrder == null) {
    return 0;
  }

  const allowedTermIds = new Set(
    (academicTerms ?? [])
      .filter((term: AcademicTerm) => {
        const levelSortOrder = Array.isArray(term.level)
          ? term.level[0]?.sort_order
          : term.level?.sort_order;

        if (levelSortOrder == null) {
          return false;
        }

        return (
          levelSortOrder < currentLevelSortOrder ||
          (levelSortOrder === currentLevelSortOrder &&
            term.sort_order <= (currentTerm?.sort_order ?? 0))
        );
      })
      .map((term) => term.id),
  );

  const { data: curriculumSubjects, error: curriculumSubjectsError } =
    await supabase
      .from("subjects")
      .select("subject_code, level_id")
      .eq("department_id", profile.department_id)
      .in("term_id", Array.from(allowedTermIds));

  if (curriculumSubjectsError) {
    throw new Error(
      `Student materials subjects loading failed: ${curriculumSubjectsError.message}`,
    );
  }

  const curriculumKeys = new Set(
    (curriculumSubjects ?? []).map(
      (subject: CurriculumSubject) =>
        `${subject.subject_code}::${subject.level_id}`,
    ),
  );

  if (curriculumKeys.size === 0) {
    return 0;
  }

  const { data: materials, error: materialsError } = await supabase
    .from("materials")
    .select(`
      subject:subjects (
        subject_code,
        level_id
      )
    `)
    .eq("status", "approved");

  if (materialsError) {
    throw new Error(
      `Student materials loading failed: ${materialsError.message}`,
    );
  }

  return (materials ?? []).filter((material: MaterialWithSubject) => {
    const subject = Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject;

    return (
      subject != null &&
      curriculumKeys.has(`${subject.subject_code}::${subject.level_id}`)
    );
  }).length;
}
export async function getStudentBookmarksCount(
  supabase: SupabaseClient,
  studentId: string,
): Promise<number> {
  const { data: bookmarks, error } = await supabase
    .from("material_bookmarks")
    .select(`
      id,
      material:materials!material_bookmarks_material_id_fkey (
        id,
        status
      )
    `)
    .eq("student_id", studentId);

  if (error) {
    throw new Error(
      `Student bookmarks loading failed: ${error.message}`,
    );
  }

  return (bookmarks ?? []).filter((bookmark) => {
    const material = Array.isArray(bookmark.material)
      ? bookmark.material[0] ?? null
      : bookmark.material;

    return material != null && material.status === "approved";
  }).length;
}