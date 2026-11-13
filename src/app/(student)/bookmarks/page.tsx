import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bookmark, BookOpen, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import BookmarksFilter from "@/components/student/BookmarksFilter";
import { getAcademicTermNavigation } from "@/lib/academic-terms";

type BookmarkMaterial = {
  id: string;
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

export default async function BookmarksPage() {
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
    { data: bookmarks, error },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("department_id, current_level_id, current_term_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("levels")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("material_bookmarks")
      .select(`
        id,
        created_at,
        material:materials!material_bookmarks_material_id_fkey (
          id,
          uploader_id,
          title,
          description,
          topic,
          file_type,
          file_size_bytes,
          views_count,
          downloads_count,
          created_at,
          status,
          subject:subjects (
            id,
            subject_code,
            subject_name,
            level_id,
            term_id
          )
        )
      `)
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
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
    console.error("[bookmarks][levels]", levelsResult.error);
  }

  if (termsResult.error) {
    console.error("[bookmarks][terms]", termsResult.error);
  }

  if (error) {
    console.error("Bookmarks loading error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  const termNavigation = getAcademicTermNavigation(
    levelsResult.data ?? [],
    termsResult.data ?? [],
    profile.current_level_id,
    profile.current_term_id,
  );

  if (!termNavigation) {
    console.error("[bookmarks] Current academic term could not be resolved.");
    redirect("/dashboard");
  }

  const allowedTerms = termNavigation.currentAndPreviousTerms;
  const allowedTermIds = allowedTerms.map((term) => term.id);

  const termOptions = allowedTerms.map((term) => {
    const level = (levelsResult.data ?? []).find(
      (item) => item.id === term.level_id,
    );

    return {
      id: term.id,
      label: `${level?.name ?? "Level"} - ${term.name}`,
    };
  });

  const currentTermLabel =
    termOptions.find((t) => t.id === profile.current_term_id)?.label ??
    "Current Term";

  const approvedBookmarkedRows = (bookmarks ?? []).flatMap((bookmark) => {
    const material = Array.isArray(bookmark.material)
      ? bookmark.material[0] ?? null
      : bookmark.material;

    if (!material || material.status !== "approved") {
      return [];
    }

    const subject = Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject;

    return [{ material, subject }];
  });

  const uniqueUploaderIds = Array.from(
    new Set(approvedBookmarkedRows.map((row) => row.material.uploader_id)),
  );

  const [
    { data: currentTermSubjects, error: subjectsError },
    uploaderEntries,
    uploaderDeptRowsResult,
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, subject_code, subject_name, level_id, term_id")
      .eq("department_id", profile.department_id)
      .in("term_id", allowedTermIds)
      .order("subject_code", { ascending: true }),
    Promise.all(
      uniqueUploaderIds.map(async (uploaderId) => {
        const { data: uploaderData } = await supabase.rpc(
          "get_public_contact_profile",
          { p_profile_id: uploaderId },
        );
        return [
          uploaderId,
          (uploaderData?.[0] ?? null) as BookmarkMaterial["uploader"],
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

  if (subjectsError) {
    console.error("[bookmarks][subjects]", subjectsError);
  }

  const uploaderDeptMap = new Map<string, string | null>(
    (
      (uploaderDeptRowsResult?.data as Array<{
        profile_id: string;
        department_name?: string | null;
        department_code?: string | null;
      }>) || []
    ).map((r) => [r.profile_id, r.department_name || r.department_code || null]),
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

  const bookmarkMaterials: BookmarkMaterial[] = approvedBookmarkedRows.map(
    ({ material, subject }) => ({
      id: material.id,
      uploader_id: material.uploader_id,
      title: material.title,
      description: material.description,
      topic: material.topic,
      file_type: material.file_type,
      file_size_bytes: material.file_size_bytes,
      views_count: material.views_count,
      downloads_count: material.downloads_count,
      created_at: material.created_at,
      uploader: uploaderMap.get(material.uploader_id) ?? null,
      subject,
    }),
  );

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
      `}</style>
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              {/* Saved Collection Hero Banner */}
              <section className="dash-stagger-1 relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#16140D] via-[#0A1120] to-[#070C17] p-6 sm:p-7 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                      <Bookmark className="h-3 w-3 fill-current" />
                      Saved Collection
                    </span>

                    <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      Saved Bookmarks
                    </h1>

                    <p className="mt-1.5 text-sm text-slate-400">
                      Your saved study materials in one place, ready anytime.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#0B1324] px-3 py-1.5 text-xs font-medium text-slate-200">
                        <Bookmark className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {bookmarkMaterials.length} Saved{" "}
                        {bookmarkMaterials.length === 1 ? "Material" : "Materials"}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#0B1324] px-3 py-1.5 text-xs font-medium text-slate-200">
                        <Layers className="h-3.5 w-3.5 text-emerald-400" />
                        {currentTermLabel}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/materials"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.3)] transition hover:bg-emerald-300 active:scale-[0.98]"
                  >
                    <BookOpen className="h-4 w-4" />
                    Browse Materials
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>

              {bookmarkMaterials.length === 0 ? (
                <section className="dash-stagger-2 rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/70 p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Bookmark className="h-6 w-6" />
                  </div>

                  <h2 className="mt-4 font-serif text-xl font-bold text-white">
                    No bookmarks yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Save useful study materials from the Study Vault and they
                    will appear right here for quick access.
                  </p>

                  <Link
                    href="/materials"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300"
                  >
                    Browse Materials
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </section>
              ) : (
                <BookmarksFilter
                  subjects={currentTermSubjects ?? []}
                  materials={bookmarkMaterials}
                  terms={termOptions}
                  currentTermId={profile.current_term_id}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}