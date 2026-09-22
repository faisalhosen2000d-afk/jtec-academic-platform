import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import UploaderContactProfile from "@/components/student/UploaderContactProfile";
import MaterialsSearch from "@/components/student/MaterialsSearch";
import MaterialCard from "@/components/student/MaterialCard";

type Material = {
  id: string;
  subject_id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  file_type: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
  created_at: string;
  uploader: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    telegram: string | null;
  } | null;
  subject: {
    subject_code: string;
    subject_name: string;
    level_id: string;
    term_id: string;
  } | null;
};

export default async function MaterialsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("department_id, current_level_id, current_term_id")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.department_id ||
    !profile.current_level_id ||
    !profile.current_term_id
  ) {
    redirect("/dashboard");
  }

  const { data: currentTermSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, subject_code, subject_name, level_id, term_id")
    .eq("department_id", profile.department_id)
    .eq("level_id", profile.current_level_id)
    .eq("term_id", profile.current_term_id)
    .order("subject_code", { ascending: true });

  if (subjectsError) {
    console.error("[materials][subjects]", subjectsError);
  }

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
    console.error("[materials][academic-terms]", academicTermsError);
  }

  const currentLevelOrder = (
    Array.isArray(academicTerms)
      ? academicTerms.find((term) => term.id === profile.current_term_id)?.level
      : null
  );

  const currentLevelSortOrder = Array.isArray(currentLevelOrder)
    ? currentLevelOrder[0]?.sort_order
    : currentLevelOrder?.sort_order;

  const allowedTermIds = new Set(
    (academicTerms ?? [])
      .filter((term) => {
        const levelSortOrder = Array.isArray(term.level)
          ? term.level[0]?.sort_order
          : term.level?.sort_order;

        if (levelSortOrder == null || currentLevelSortOrder == null) {
          return false;
        }

        return (
          levelSortOrder < currentLevelSortOrder ||
          (
            levelSortOrder === currentLevelSortOrder &&
            term.sort_order <= (
              (academicTerms ?? []).find(
                (currentTerm) => currentTerm.id === profile.current_term_id,
              )?.sort_order ?? 0
            )
          )
        );
      })
      .map((term) => term.id),
  );

  const { data: curriculumSubjects, error: curriculumSubjectsError } =
    await supabase
      .from("subjects")
      .select(`
        id,
        subject_code,
        subject_name,
        level_id,
        term_id
      `)
      .eq("department_id", profile.department_id)
      .in("term_id", Array.from(allowedTermIds))
      .order("subject_code", { ascending: true });

  if (curriculumSubjectsError) {
    console.error(
      "[materials][curriculum-subjects]",
      curriculumSubjectsError,
    );
  }

  const { data: materials, error } = await supabase
    .from("materials")
    .select(`
      id,
      subject_id,
     uploader_id,
      title,
      description,
      topic,
      file_type,
      file_size_bytes,
      views_count,
      downloads_count,
      created_at,
      subject:subjects (
        subject_code,
        subject_name,
        level_id,
        term_id
      )
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
  console.error("Materials loading error:", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  throw new Error(
    `Materials loading failed: ${error.message}`
  );
}

  const curriculumKeys = new Set(
    (curriculumSubjects ?? []).map(
      (subject) =>
        `${subject.subject_code}::${subject.level_id}::${subject.term_id}`,
    ),
  );

  const visibleMaterials = (materials ?? []).filter((material) => {
    const subject = Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject;

    return (
      subject != null &&
      curriculumKeys.has(
        `${subject.subject_code}::${subject.level_id}::${subject.term_id}`,
      )
    );
  });

  const materialList: Material[] = await Promise.all(
  visibleMaterials.map(async (material) => {
    const { data: uploaderData } = await supabase.rpc(
      "get_public_contact_profile",
      { p_profile_id: material.uploader_id },
    );

    const uploader = (uploaderData?.[0] ?? null) as Material["uploader"];

    return {
      ...material,
      uploader,
      subject: Array.isArray(material.subject)
        ? material.subject[0] ?? null
        : material.subject,
    };
  }),
);
function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">

              {/* Page Header */}
              <section>
                <p className="text-sm text-muted-foreground">
                  Student Portal
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Academic Materials
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Browse approved academic materials available to you.
                </p>
              </section>

              {/* Materials Search */}
              <MaterialsSearch
                subjects={currentTermSubjects ?? []}
                materials={materialList}
              />

              {/* Materials Count */}
              <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Available Materials
                </p>

                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {materialList.length}
                </p>
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
