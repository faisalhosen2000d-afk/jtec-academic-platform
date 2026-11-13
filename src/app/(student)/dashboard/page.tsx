import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  Bookmark,
  Building2,
  GraduationCap,
  Layers,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import NoticeList from "@/components/dashboard/NoticeList";
import {
  getStudentBookmarksCount,
  getStudentVisibleMaterialsCount,
} from "@/server/services/student-materials";

type DashboardProfileJoin = {
  student_id: string | null;
  full_name: string;
  email: string;
  department_id: string | null;
  batch_id: string | null;
  current_level_id: string | null;
  current_term_id: string | null;
  is_verified: boolean;
  verification_status?: string;
  departments?: { name: string } | null;
  batches?: { name: string } | null;
  levels?: { name: string } | null;
  terms?: { name: string } | null;
};

function getBDTimeGreeting(): string {
  const nowUtc = new Date();
  const bdHour = (nowUtc.getUTCHours() + 6) % 24;
  if (bdHour >= 5 && bdHour < 12) return "Good Morning";
  if (bdHour >= 12 && bdHour < 17) return "Good Afternoon";
  if (bdHour >= 17 && bdHour < 21) return "Good Evening";
  return "Study Late, Shine Bright";
}

function formatOrdinalRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    profileResult,
    noticesResult,
    noticeCategoriesResult,
    bookmarksCount,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        student_id,
        full_name,
        email,
        department_id,
        batch_id,
        current_level_id,
        current_term_id,
        is_verified,
        verification_status,
        departments:department_id (name),
        batches:batch_id (name),
        levels:current_level_id (name),
        terms:current_term_id (name)
      `)
      .eq("id", user.id)
      .single(),
    supabase
      .from("notices")
      .select(
        "id, title, category_id, content, target_scope, target_department_id, target_batch_id, target_level_id, target_term_id, is_pinned, created_at",
      )
      .eq("is_archived", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("notice_categories")
      .select("id, name")
      .order("name", { ascending: true }),
    getStudentBookmarksCount(supabase, user.id),
  ]);

  const rawProfile =
    (profileResult.data as unknown) as DashboardProfileJoin | null;
  const { data: notices } = noticesResult;
  const { data: noticeCategories } = noticeCategoriesResult;

  const isApprovedStudent = Boolean(
    rawProfile?.is_verified === true ||
      rawProfile?.verification_status === "approved",
  );

  const studentName =
    rawProfile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Student";

  const departmentName =
    rawProfile?.departments?.name ||
    (isApprovedStudent ? "Not assigned" : "Pending Verification");
  const batchName =
    rawProfile?.batches?.name ||
    (isApprovedStudent ? "Not assigned" : "Pending Verification");
  const levelName =
    rawProfile?.levels?.name ||
    (isApprovedStudent ? "Not assigned" : "Pending Verification");
  const termName =
    rawProfile?.terms?.name ||
    (isApprovedStudent ? "Not assigned" : "Pending Verification");

  let materialsCount = 0;
  let cardScoreText = isApprovedStudent ? "No Results" : "Pending Verification";
  let cardRankText = isApprovedStudent ? "Unranked" : "—";
  let totalPendingRetakes = 0;
  let lastTerm: {
    level_term_key: string;
    gpa: number;
    cgpa: number | null;
    status?: string;
    term_retake_count: number;
  } | null = null;
  let sortedBatch: Array<{
    sid: string;
    score: number;
    retakes: number;
    term: string;
  }> = [];
  let myIdx = -1;

  if (isApprovedStudent && rawProfile?.student_id) {
    const rawAdmin = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const myCleanRoll = rawProfile.student_id.trim();

    try {
      await rawAdmin.rpc("check_and_sync_air_dropped_student", {
        target_user_id: user.id,
        target_student_id: rawProfile.student_id,
      });
    } catch {
      // Gracefully continue
    }

    const [matCount, resData, rankData] = await Promise.all([
      rawProfile.department_id &&
      rawProfile.current_level_id &&
      rawProfile.current_term_id
        ? getStudentVisibleMaterialsCount(supabase, {
            department_id: rawProfile.department_id,
            current_level_id: rawProfile.current_level_id,
            current_term_id: rawProfile.current_term_id,
          })
        : Promise.resolve(0),
      rawAdmin
        .from("term_results")
        .select(
          "id, level_term_key, gpa, cgpa, status, term_retake_count, level_id, term_id",
        )
        .or(
          myCleanRoll
            ? `student_id.eq.${user.id},student_id_code.eq.${myCleanRoll}`
            : `student_id.eq.${user.id}`,
        )
        .order("level_term_key", { ascending: true }),
      rawAdmin
        .from("term_results")
        .select(
          "student_id, student_id_code, department_id, batch_id, level_term_key, gpa, cgpa, term_retake_count, status",
        )
        .order("level_term_key", { ascending: true }),
    ]);

    materialsCount = matCount || 0;

    const rawUserTerms = (resData?.data || []) as Array<{
      id?: string;
      level_term_key: string;
      gpa: number;
      cgpa: number | null;
      status?: string;
      term_retake_count: number;
      level_id?: string;
      term_id?: string;
    }>;

    let firstDropTerm: (typeof rawUserTerms)[0] | null = null;
    const userTerms: typeof rawUserTerms = [];
    for (const t of rawUserTerms) {
      if (t.status === "air_dropped") {
        if (!firstDropTerm) {
          firstDropTerm = t;
          userTerms.push(t);
        }
      } else {
        userTerms.push(t);
      }
    }

    const passedUserTerms = userTerms.filter((t) => t.status !== "air_dropped");
    const lastPassedTerm =
      passedUserTerms.length > 0
        ? passedUserTerms[passedUserTerms.length - 1]
        : null;
    lastTerm =
      lastPassedTerm ??
      (userTerms.length > 0 ? (userTerms[userTerms.length - 1] ?? null) : null);

    cardScoreText = lastPassedTerm
      ? lastPassedTerm.level_term_key === "1-1"
        ? `${Number(lastPassedTerm.gpa).toFixed(2)} GPA`
        : `${Number(lastPassedTerm.cgpa ?? lastPassedTerm.gpa).toFixed(2)} CGPA`
      : firstDropTerm
        ? "Year Dropped"
        : "No Results";

    totalPendingRetakes = firstDropTerm
      ? 5
      : Number(lastPassedTerm?.term_retake_count) || 0;

    const allBatchRows = (rankData?.data || []) as Array<{
      student_id: string;
      student_id_code?: string;
      department_id: string;
      batch_id: string;
      level_term_key: string;
      gpa: number;
      cgpa: number | null;
      term_retake_count: number;
      status?: string;
    }>;

    const myTargetBatch =
      rawProfile.batch_id ||
      (lastTerm
        ? allBatchRows.find((r) => r.student_id === user.id)?.batch_id
        : undefined);
    const myTargetDept =
      rawProfile.department_id ||
      (lastTerm
        ? allBatchRows.find((r) => r.student_id === user.id)?.department_id
        : undefined);

    const peerRows = allBatchRows.filter(
      (r) =>
        r.status !== "air_dropped" &&
        (!myTargetBatch || r.batch_id === myTargetBatch) &&
        (!myTargetDept || r.department_id === myTargetDept),
    );

    const activeRows = peerRows;
    const pfxMap = new Map<string, number>();
    activeRows.forEach((row) => {
      const rk = ((row as { student_id_code?: string }).student_id_code || "").trim();
      if (rk.length >= 3) {
        pfxMap.set(rk.slice(0, 3), (pfxMap.get(rk.slice(0, 3)) || 0) + 1);
      }
    });
    let regPfx = "";
    let maxPfx = 0;
    pfxMap.forEach((c, p) => {
      if (c > maxPfx) {
        maxPfx = c;
        regPfx = p;
      }
    });

    const studentBestMap = new Map<
      string,
      { score: number; retakes: number; term: string }
    >();
    activeRows.forEach((row) => {
      const rk = ((row as { student_id_code?: string }).student_id_code || "").trim();
      if (regPfx && rk.length >= 3 && !rk.startsWith(regPfx)) return;
      const rKey =
        (row as { student_id_code?: string }).student_id_code ||
        row.student_id;
      const prev = studentBestMap.get(rKey);
      if (!prev || row.level_term_key >= prev.term) {
        const val =
          row.cgpa !== null && row.level_term_key !== "1-1"
            ? Number(row.cgpa)
            : Number(row.gpa);
        studentBestMap.set(rKey, {
          score: val,
          retakes: Number(row.term_retake_count) || 0,
          term: row.level_term_key,
        });
      }
    });

    const currentBatchTerm = lastTerm?.level_term_key || "2-1";
    sortedBatch = Array.from(studentBestMap.entries())
      .filter(([, d]) => !currentBatchTerm || d.term === currentBatchTerm)
      .map(([sid, d]) => ({ sid, ...d }))
      .sort((a, b) =>
        b.score !== a.score ? b.score - a.score : a.retakes - b.retakes,
      );

    myIdx = sortedBatch.findIndex(
      (item) =>
        item.sid === user.id || item.sid === rawProfile.student_id,
    );
    cardRankText =
      myIdx >= 0 && !firstDropTerm ? formatOrdinalRank(myIdx + 1) : "Unranked";
  }

  const greeting = getBDTimeGreeting();

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
        .dash-stagger-3 { animation: dashFadeUp 0.45s ease-out 0.16s both; }
        .dash-stagger-4 { animation: dashFadeUp 0.45s ease-out 0.24s both; }
      `}</style>

      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="relative flex-1 p-5 sm:p-6 lg:p-8">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
              <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-7xl space-y-6">
              {/* Refreshing Greeting Hero */}
              <section className="dash-stagger-1 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-[#0A1020] via-[#0A1020] to-emerald-950/20 p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    <Sparkles className="h-3 w-3" />
                    {greeting}
                  </span>
                  <h2 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {studentName}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                    Your JTEC Academic Hub · Everything organized for today&apos;s
                    study.
                  </p>
                </div>

                {isApprovedStudent ? (
                  <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                    Verified Student
                  </span>
                ) : (
                  <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300">
                    Pending Verification
                  </span>
                )}
              </section>

              {/* Academic Information */}
              <section className="dash-stagger-2 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:border-cyan-500/35">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    Academic Information
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Your current academic assignment and enrollment details.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-cyan-500/25 bg-[#060A12] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/55 hover:bg-[#0D162B]">
                    <div className="flex items-center gap-2 text-xs text-cyan-400">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Department</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {departmentName}
                    </p>
                  </div>

                  <div className="rounded-xl border border-violet-500/25 bg-[#060A12] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/55 hover:bg-[#0D162B]">
                    <div className="flex items-center gap-2 text-xs text-violet-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>Batch</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {batchName}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/25 bg-[#060A12] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/55 hover:bg-[#0D162B]">
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Level</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {levelName}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-500/25 bg-[#060A12] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/55 hover:bg-[#0D162B]">
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>Term</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {termName}
                    </p>
                  </div>
                </div>
              </section>

              {/* 4 KPI Stat Cards */}
              <section className="dash-stagger-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Link
                  href="/materials"
                  className="group rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/65 hover:bg-[#0D162B] hover:shadow-[0_12px_30px_rgba(6,182,212,0.14)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Materials
                    </p>
                    <BookOpen className="h-4 w-4 text-cyan-400 transition-transform group-hover:scale-110" />
                  </div>
                  <p className="mt-3 font-serif text-3xl font-bold text-cyan-300">
                    {materialsCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Available for you
                  </p>
                </Link>

                <Link
                  href="/bookmarks"
                  className="group rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/65 hover:bg-[#0D162B] hover:shadow-[0_12px_30px_rgba(16,185,129,0.14)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Bookmarks
                    </p>
                    <Bookmark className="h-4 w-4 text-emerald-400 transition-transform group-hover:scale-110" />
                  </div>
                  <p className="mt-3 font-serif text-3xl font-bold text-emerald-300">
                    {bookmarksCount || 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Saved materials</p>
                </Link>

                <Link
                  href="/results"
                  className="group rounded-2xl border border-sky-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/65 hover:bg-[#0D162B] hover:shadow-[0_12px_30px_rgba(56,189,248,0.14)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Results
                    </p>
                    <TrendingUp className="h-4 w-4 text-sky-400 transition-transform group-hover:scale-110" />
                  </div>
                  <p className="mt-3 font-serif text-2xl font-bold text-sky-300 sm:text-3xl">
                    {cardScoreText}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {lastTerm
                      ? `Term ${lastTerm.level_term_key} · ${totalPendingRetakes > 0 ? `${totalPendingRetakes} Retake` : "All Clear"}`
                      : "Academic results"}
                  </p>
                </Link>

                <Link
                  href="/ranking"
                  className="group rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/65 hover:bg-[#0D162B] hover:shadow-[0_12px_30px_rgba(245,158,11,0.14)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ranking
                    </p>
                    <Award className="h-4 w-4 text-amber-400 transition-transform group-hover:scale-110" />
                  </div>
                  <p className="mt-3 font-serif text-2xl font-bold text-amber-300 sm:text-3xl">
                    {cardRankText}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {myIdx >= 0
                      ? `Out of ${sortedBatch.length} in batch`
                      : "Current position"}
                  </p>
                </Link>
              </section>

              {/* Official Notices */}
              <section className="dash-stagger-4 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:border-cyan-500/35">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/15 text-cyan-300">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-white">
                        Official Notices
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Recent academic notices relevant to you.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/notifications"
                    className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:scale-95"
                  >
                    View Notifications
                  </Link>
                </div>

                <div className="mt-5">
                  {notices && notices.length > 0 ? (
                    <NoticeList categories={noticeCategories ?? []}>
                      <div className="divide-y divide-slate-800/80">
                        {notices.map((notice) => (
                          <Link
                            key={notice.id}
                            href={`/notices/${notice.id}`}
                            data-notice-search={`${notice.title} ${notice.content}`}
                            data-notice-category={notice.category_id ?? ""}
                            className="block rounded-xl p-4 transition-all duration-150 hover:bg-[#0D162B]/90"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-white">
                                    {notice.title}
                                  </h4>
                                  {notice.is_pinned ? (
                                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                      Pinned
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                  {new Intl.DateTimeFormat("en-US", {
                                    timeZone: "Asia/Dhaka",
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(notice.created_at))}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </NoticeList>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
                      <p className="font-serif text-sm font-bold text-white">
                        No notices yet
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        New academic notices relevant to you will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}