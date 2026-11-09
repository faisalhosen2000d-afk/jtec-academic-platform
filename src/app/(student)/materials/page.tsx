import { createClient } from "@/lib/supabase/server";
import { getAcademicTermNavigation } from "@/lib/academic-terms";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import MaterialsSearch from "@/components/student/MaterialsSearch";

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
    department_name?: string | null;
  } | null;
  subject: {
    id: string;
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

  const [
    { data: profile, error: profileError },
    levelsResult,
    termsResult,
    { data: materials, error },
    { data: bookmarkedMaterials, error: bookmarkedMaterialsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("department_id, current_level_id, current_term_id")
      .eq("id", user.id)
      .single(),
    supabase.from("levels").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order"),
    supabase
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
          id,
          subject_code,
          subject_name,
          level_id,
          term_id
        )
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("material_bookmarks")
      .select("material_id")
      .eq("student_id", user.id),
  ]);

  if (
    profileError ||
    !profile ||
    !profile.department_id ||
    !profile.current_level_id ||
    !profile.current_term_id
  ) {
    redirect("/dashboard");
  }

  if (levelsResult.error) {
    console.error("[materials][levels]", levelsResult.error);
  }

  if (termsResult.error) {
    console.error("[materials][terms]", termsResult.error);
  }

  if (error) {
    console.error("Materials loading error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(`Materials loading failed: ${error.message}`);
  }

  if (bookmarkedMaterialsError) {
    console.error("[materials][bookmarks]", bookmarkedMaterialsError);
  }

  const termNavigation = getAcademicTermNavigation(
    levelsResult.data ?? [],
    termsResult.data ?? [],
    profile.current_level_id,
    profile.current_term_id,
  );

  if (!termNavigation) {
    console.error("[materials] Invalid current academic assignment.");
    redirect("/dashboard");
  }

  const allowedTerms = termNavigation.currentAndPreviousTerms;
  const allowedTermIds = new Set(allowedTerms.map((term) => term.id));

  const termOptions = allowedTerms.map((term) => {
    const level = (levelsResult.data ?? []).find(
      (item) => item.id === term.level_id,
    );

    return {
      id: term.id,
      label: `${level?.name ?? "Level"} - ${term.name}`,
    };
  });

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

  const curriculumSubjectByKey = new Map(
    (curriculumSubjects ?? []).map(
      (subject) =>
        [`${subject.subject_code}::${subject.level_id}`, subject] as const,
    ),
  );

  const visibleMaterials = (materials ?? []).flatMap((material) => {
    const materialSubject = Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject;

    if (materialSubject == null) {
      return [];
    }

    const ownSubject = curriculumSubjectByKey.get(
      `${materialSubject.subject_code}::${materialSubject.level_id}`,
    );

    if (!ownSubject) {
      return [];
    }

    return [{ ...material, subject_id: ownSubject.id, subject: ownSubject }];
  });

  const bookmarkedMaterialIds = new Set(
    (bookmarkedMaterials ?? []).map((bookmark) => bookmark.material_id),
  );

  const uniqueUploaderIds = Array.from(
    new Set(visibleMaterials.map((m) => m.uploader_id)),
  );

  const [uploaderEntries, uploaderDeptProfilesResult] = await Promise.all([
    Promise.all(
      uniqueUploaderIds.map(async (uploaderId) => {
        const { data: uploaderData } = await supabase.rpc(
          "get_public_contact_profile",
          { p_profile_id: uploaderId },
        );
        return [
          uploaderId,
          (uploaderData?.[0] ?? null) as Material["uploader"],
        ] as const;
      }),
    ),
    supabase
      .from("profiles")
      .select("id, departments:department_id (name, code)")
      .in("id", uniqueUploaderIds.length > 0 ? uniqueUploaderIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const uploaderDeptMap = new Map<string, string | null>(
    (uploaderDeptProfilesResult?.data || []).map((p) => {
      const row = p as { id: string; departments?: { name?: string | null; code?: string | null } | null };
      return [
        row.id,
        row.departments?.name || row.departments?.code || null,
      ];
    }),
  );

  const uploaderMap = new Map(
    uploaderEntries.map(([uid, uData]) => [
      uid,
      uData
        ? {
            ...uData,
            department_name: uploaderDeptMap.get(uid) ?? null,
          }
        : null,
    ]),
  );

  const materialList: Material[] = visibleMaterials.map((material) => ({
    ...material,
    uploader: uploaderMap.get(material.uploader_id) ?? null,
    subject: Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject,
  }));

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
                subjects={curriculumSubjects ?? []}
                materials={materialList}
                bookmarkedMaterialIds={Array.from(bookmarkedMaterialIds)}
                terms={termOptions}
                currentTermId={profile.current_term_id}
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