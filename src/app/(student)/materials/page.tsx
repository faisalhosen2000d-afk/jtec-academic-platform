import Link from "next/link";
import { Bookmark, CheckCircle2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAcademicTermNavigation } from "@/lib/academic-terms";
import { redirect } from "next/navigation";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import MaterialsVaultClient from "@/components/student/MaterialsVaultClient";
import B2BandwidthBanner from "@/components/student/B2BandwidthBanner";
import { getTodayB2BandwidthStatus } from "@/lib/b2-bandwidth";
import type { QuestionBankFolder, QuestionBankItem } from "@/components/student/QuestionBankSection";

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

  const questionSubjectByKey = new Map(
    (curriculumSubjects ?? []).map(
      (subject) => [`${subject.subject_code}::${subject.term_id}`, subject] as const,
    ),
  );

  const questionSubjectByCode = new Map(
    (curriculumSubjects ?? []).map(
      (subject) => [subject.subject_code, subject] as const,
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

  const questionItems: QuestionBankItem[] = [];
  const questionFolders: QuestionBankFolder[] = [];
  const takenQuestionSlots: Array<{
    subject_code: string;
    level_id: string;
    term_id: string;
    question_type: "previous_year" | "ct";
    exam_year: number | null;
    ct_number: number | null;
    status: string;
  }> = [];

  try {
    const rawSb = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const [{ data: qRows }, { data: deptRows }, { data: fRows }] = await Promise.all([
      rawSb
        .from("question_bank_items")
        .select("id, uploader_id, subject_id, subject_code, level_id, term_id, department_id, folder_id, question_type, exam_year, ct_number, batch_label, notes, file_size_bytes, share_across_depts, status, views_count, downloads_count, created_at")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false }),
      supabase.from("departments").select("id, code, name"),
      rawSb
        .from("question_bank_folders")
        .select("id, department_id, term_id, subject_id, subject_code, question_type, parent_id, name, created_by, created_at")
        .order("name", { ascending: true }),
    ]);

    for (const fRow of (fRows ?? []) as Array<Record<string, unknown>>) {
      const fCode = String(fRow.subject_code ?? "");
      const fTerm = String(fRow.term_id ?? "");
      const exactSubj = questionSubjectByKey.get(`${fCode}::${fTerm}`);
      const refSubj = !exactSubj ? questionSubjectByCode.get(fCode) : undefined;
      const ownSubj = exactSubj ?? refSubj;
      if (!ownSubj) continue;

      questionFolders.push({
        id: String(fRow.id),
        department_id: String(fRow.department_id ?? ""),
        term_id: ownSubj.term_id,
        subject_id: ownSubj.id,
        subject_code: fCode,
        question_type: fRow.question_type === "ct" ? "ct" : "previous_year",
        parent_id: typeof fRow.parent_id === "string" ? fRow.parent_id : null,
        name: String(fRow.name ?? "Folder"),
        created_by: String(fRow.created_by ?? ""),
        created_at: String(fRow.created_at ?? ""),
      });
    }

    const qUploaderIds = Array.from(
      new Set(
        ((qRows ?? []) as Array<Record<string, unknown>>)
          .map((r) => String(r.uploader_id ?? ""))
          .filter(Boolean),
      ),
    );
    const { data: qProfileRows } = qUploaderIds.length
      ? await rawSb
          .from("profiles")
          .select("id, full_name, student_id, avatar_url, email, department_id")
          .in("id", qUploaderIds)
      : { data: [] as Array<Record<string, unknown>> };
    const qUploaderMap = new Map(
      ((qProfileRows ?? []) as Array<{ id: string; full_name?: string | null; student_id?: string | null; avatar_url?: string | null; email?: string | null; department_id?: string | null }>).map((p) => [
        String(p.id),
        {
          full_name: String(p.full_name || "JTEC Student"),
          student_id: p.student_id ? String(p.student_id) : null,
          avatar_url: p.avatar_url ? String(p.avatar_url) : null,
          email: p.email ? String(p.email) : null,
          department_id: p.department_id ? String(p.department_id) : null,
        },
      ]),
    );

    const deptRowsTyped = (deptRows ?? []) as Array<{ id: string; code: string | null; name?: string | null }>;
    const deptCodeById = new Map(
      deptRowsTyped.map((d) => [String(d.id), String(d.code ?? "")]),
    );
    const deptNameById = new Map(
      deptRowsTyped.map((d) => [String(d.id), String(d.name ?? "")]),
    );
    const levelNameById = new Map(
      (levelsResult.data ?? []).map((l) => [String(l.id), String(l.name ?? "")]),
    );
    const termLabelById = new Map(
      (termsResult.data ?? []).map((t) => [
        String(t.id),
        `${levelNameById.get(String(t.level_id)) ?? "Level"} - ${t.name}`,
      ]),
    );

    for (const row of (qRows ?? []) as Array<Record<string, unknown>>) {
      const sCode = String(row.subject_code ?? "");
      const sLevel = String(row.level_id ?? "");
      const sTerm = String(row.term_id ?? "");
      const exactSubj = questionSubjectByKey.get(`${sCode}::${sTerm}`);
      const refSubj = !exactSubj ? questionSubjectByCode.get(sCode) : undefined;
      const ownSubj = exactSubj ?? refSubj;
      if (!ownSubj) continue;
      const isCrossTermRef = !exactSubj;

      const sameDept = String(row.department_id ?? "") === profile.department_id;
      const shared = row.share_across_depts !== false;
      if (!sameDept && !shared) continue;

      const qType = row.question_type === "ct" ? "ct" : "previous_year";
      const eYear = typeof row.exam_year === "number" ? row.exam_year : null;
      const cNum = typeof row.ct_number === "number" ? row.ct_number : null;
      const st = String(row.status ?? "pending");

      if (!isCrossTermRef) {
        takenQuestionSlots.push({
          subject_code: sCode,
          level_id: sLevel,
          term_id: sTerm,
          question_type: qType,
          exam_year: eYear,
          ct_number: cNum,
          status: st,
        });
      }

      if (st === "approved") {
        questionItems.push({
          id: String(row.id),
          subject_id: ownSubj.id,
          subject_code: sCode,
          level_id: ownSubj.level_id,
          term_id: ownSubj.term_id,
          folder_id: typeof row.folder_id === "string" ? row.folder_id : null,
          question_type: qType,
          exam_year: eYear,
          ct_number: cNum,
          batch_label: typeof row.batch_label === "string" ? row.batch_label : null,
          notes: typeof row.notes === "string" ? row.notes : null,
          file_size_bytes: Number(row.file_size_bytes ?? 0),
          status: st,
          views_count: Number(row.views_count ?? 0),
          downloads_count: Number(row.downloads_count ?? 0),
          created_at: String(row.created_at ?? ""),
          is_reference: isCrossTermRef,
          is_own_dept: sameDept,
          source_label: (() => {
            const dCode = deptCodeById.get(String(row.department_id ?? ""));
            if (isCrossTermRef) {
              return [dCode, termLabelById.get(sTerm)].filter(Boolean).join(" \u00B7 ") || "Other Term";
            }
            if (dCode) {
              return sameDept ? `${dCode} \u00B7 Your Dept` : `${dCode} \u00B7 Same Term`;
            }
            return sameDept ? "Your Dept" : "Other Dept";
          })(),
          uploader: (() => {
            const u = qUploaderMap.get(String(row.uploader_id ?? ""));
            if (!u) return null;
            return {
              ...u,
              dept_code: deptCodeById.get(u.department_id || String(row.department_id ?? "")) || null,
              dept_name: deptNameById.get(u.department_id || String(row.department_id ?? "")) || null,
            };
          })(),
        });
      }
    }
  } catch {
    // Gracefully fall back if table is not migrated yet
  }

  const b2Bandwidth = await getTodayB2BandwidthStatus();

  return (
    <div className="min-h-full bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
      `}</style>
      <div className="flex min-h-full">

        <div className="flex min-w-0 flex-1 flex-col">

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              {/* Study Vault Hero Banner */}
              <section className="dash-stagger-1 relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0B1C1E] via-[#0A1120] to-[#070C17] p-6 sm:p-7 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
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

              {/* Smart B2 Bandwidth Notice (Visible only at >=80%) */}
              <B2BandwidthBanner status={b2Bandwidth} />

              {/* Materials Search & Grid */}
              <MaterialsVaultClient
                subjects={curriculumSubjects ?? []}
                materials={materialList}
                bookmarkedMaterialIds={Array.from(bookmarkedMaterialIds)}
                terms={termOptions}
                currentTermId={termNavigation.currentTerm.id}
                questionItems={questionItems}
                questionFolders={questionFolders}
                takenQuestionSlots={takenQuestionSlots}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}