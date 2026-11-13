import Link from "next/link";
import { Bookmark, CheckCircle2, Plus } from "lucide-react";
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

  const [uploaderEntries, uploaderDeptRowsResult] = await Promise.all([
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
    (
      supabase.rpc as unknown as (
        name: string,
        args?: Record<string, unknown>
      ) => Promise<{
        data: Array<{
          profile_id: string;
          department_name?: string | null;
          department_code?: string | null;
        }> | null;
      }>
    )("get_uploader_departments", {
      p_profile_ids:
        uniqueUploaderIds.length > 0
          ? uniqueUploaderIds
          : ["00000000-0000-0000-0000-000000000000"],
    }),
  ]);

  const uploaderDeptMap = new Map<string, string | null>(
    ((uploaderDeptRowsResult?.data as Array<{ profile_id: string; department_name?: string | null; department_code?: string | null }>) || []).map((r) => [
      r.profile_id,
      r.department_name || r.department_code || null,
    ]),
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
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              {/* Study Vault Hero Banner */}
              <section className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0B1C1E] via-[#0A1120] to-[#070C17] p-6 sm:p-7 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                      Study Vault
                    </span>

                    <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      Academic Materials
                    </h1>

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#0B1324] px-3 py-1.5 text-xs font-medium text-slate-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        {materialList.length} Approved Materials
                      </span>

                      <Link
                        href="/bookmarks"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#0B1324] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
                      >
                        <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                        {bookmarkedMaterialIds.size} Bookmarked
                      </Link>
                    </div>
                  </div>

                  <Link
                    href="/upload"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.35)] transition hover:bg-emerald-300 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    Upload Material
                  </Link>
                </div>
              </section>

              {/* Materials Search & Grid */}
              <MaterialsSearch
                subjects={curriculumSubjects ?? []}
                materials={materialList}
                bookmarkedMaterialIds={Array.from(bookmarkedMaterialIds)}
                terms={termOptions}
                currentTermId={profile.current_term_id}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}