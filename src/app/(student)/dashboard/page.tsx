import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
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

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Single Concurrently-Batched Fetch: Profile with Relational Joins + Notices + Bookmarks
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
        "id, title, category_id, content, target_scope, target_department_id, target_batch_id, target_level_id, target_term_id, is_pinned, created_at"
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

  const rawProfile = (profileResult.data as unknown) as DashboardProfileJoin | null;
  const { data: notices } = noticesResult;
  const { data: noticeCategories } = noticeCategoriesResult;

  const isApprovedStudent = Boolean(
    rawProfile?.is_verified === true || rawProfile?.verification_status === "approved"
  );

  const studentName =
    rawProfile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Student";

  const studentId =
    rawProfile?.student_id ||
    user.user_metadata?.student_id ||
    "Student";

  const studentEmail = rawProfile?.email || user.email || "-";

  const departmentName = rawProfile?.departments?.name || (isApprovedStudent ? "Not assigned" : "Pending Verification");
  const batchName = rawProfile?.batches?.name || (isApprovedStudent ? "Not assigned" : "Pending Verification");
  const levelName = rawProfile?.levels?.name || (isApprovedStudent ? "Not assigned" : "Pending Verification");
  const termName = rawProfile?.terms?.name || (isApprovedStudent ? "Not assigned" : "Pending Verification");

  // 2. Performance Optimization: If unverified/pending, skip heavy college-wide result queries
  let materialsCount = 0;
  let cardScoreText = isApprovedStudent ? "No Results" : "Pending Verification";
  let cardRankText = isApprovedStudent ? "Unranked" : "—";
  let totalPendingRetakes = 0;
  let lastTerm: { level_term_key: string; gpa: number; cgpa: number | null; status?: string; term_retake_count: number } | null = null;
  let sortedBatch: Array<{ sid: string; score: number; retakes: number; term: string }> = [];
  let myIdx = -1;

  if (isApprovedStudent && rawProfile?.student_id) {
    const rawAdmin = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const myCleanRoll = rawProfile.student_id.trim();

    // Run Air-drop sync safely
    try {
      await rawAdmin.rpc("check_and_sync_air_dropped_student", {
        target_user_id: user.id,
        target_student_id: rawProfile.student_id,
      });
    } catch {
      // Gracefully continue
    }

    // Run Materials Count & Results concurrently
    const [matCount, resData, rankData] = await Promise.all([
      rawProfile.department_id && rawProfile.current_level_id && rawProfile.current_term_id
        ? getStudentVisibleMaterialsCount(supabase, {
            department_id: rawProfile.department_id,
            current_level_id: rawProfile.current_level_id,
            current_term_id: rawProfile.current_term_id,
          })
        : Promise.resolve(0),
      rawAdmin
        .from("term_results")
        .select("id, level_term_key, gpa, cgpa, status, term_retake_count, level_id, term_id")
        .or(myCleanRoll ? `student_id.eq.${user.id},student_id_code.eq.${myCleanRoll}` : `student_id.eq.${user.id}`)
        .order("level_term_key", { ascending: true }),
      rawAdmin
        .from("term_results")
        .select("student_id, student_id_code, department_id, batch_id, level_term_key, gpa, cgpa, term_retake_count, status")
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

    let firstDropTerm: typeof rawUserTerms[0] | null = null;
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
    const lastPassedTerm = passedUserTerms.length > 0 ? passedUserTerms[passedUserTerms.length - 1] : null;
    lastTerm =
  lastPassedTerm ??
  (userTerms.length > 0
    ? userTerms[userTerms.length - 1] ?? null
    : null);

    cardScoreText = lastPassedTerm
      ? lastPassedTerm.level_term_key === "1-1"
        ? `${Number(lastPassedTerm.gpa).toFixed(2)} GPA`
        : `${Number(lastPassedTerm.cgpa ?? lastPassedTerm.gpa).toFixed(2)} CGPA`
      : firstDropTerm
      ? "Year Dropped"
      : "No Results";

    totalPendingRetakes = firstDropTerm ? 5 : Number(lastPassedTerm?.term_retake_count) || 0;

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

    const myTargetBatch = rawProfile.batch_id || (lastTerm ? allBatchRows.find((r) => r.student_id === user.id)?.batch_id : undefined);
    const myTargetDept = rawProfile.department_id || (lastTerm ? allBatchRows.find((r) => r.student_id === user.id)?.department_id : undefined);

    const peerRows = allBatchRows.filter(
      (r) => r.status !== "air_dropped" && (!myTargetBatch || r.batch_id === myTargetBatch) && (!myTargetDept || r.department_id === myTargetDept)
    );

    const activeRows = peerRows;
    const pfxMap = new Map<string, number>();
    activeRows.forEach((row) => {
      const rk = ((row as { student_id_code?: string }).student_id_code || "").trim();
      if (rk.length >= 3) pfxMap.set(rk.slice(0, 3), (pfxMap.get(rk.slice(0, 3)) || 0) + 1);
    });
    let regPfx = "";
    let maxPfx = 0;
    pfxMap.forEach((c, p) => { if (c > maxPfx) { maxPfx = c; regPfx = p; } });

    const studentBestMap = new Map<string, { score: number; retakes: number; term: string }>();
    activeRows.forEach((row) => {
      const rk = ((row as { student_id_code?: string }).student_id_code || "").trim();
      if (regPfx && rk.length >= 3 && !rk.startsWith(regPfx)) return;
      const rKey = (row as { student_id_code?: string }).student_id_code || row.student_id;
      const prev = studentBestMap.get(rKey);
      if (!prev || row.level_term_key >= prev.term) {
        const val = row.cgpa !== null && row.level_term_key !== "1-1" ? Number(row.cgpa) : Number(row.gpa);
        studentBestMap.set(rKey, { score: val, retakes: Number(row.term_retake_count) || 0, term: row.level_term_key });
      }
    });

    const currentBatchTerm = lastTerm?.level_term_key || "2-1";
    sortedBatch = Array.from(studentBestMap.entries())
      .filter(([_, d]) => !currentBatchTerm || d.term === currentBatchTerm)
      .map(([sid, d]) => ({ sid, ...d }))
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.retakes - b.retakes));

    myIdx = sortedBatch.findIndex((item) => item.sid === user.id || item.sid === rawProfile.student_id);
    cardRankText = myIdx >= 0 && !firstDropTerm ? `#${myIdx + 1}` : "Unranked";
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              {/* Welcome */}
              <section>
                <p className="text-sm text-muted-foreground">Welcome back</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Hello, {studentName} &#128075;
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Here&apos;s an overview of your academic activity.
                </p>
              </section>

              {/* Academic Information */}
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div>
                  <h3 className="font-semibold text-foreground">Academic Information</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Your current academic information.</p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{departmentName}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Batch</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{batchName}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{levelName}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Term</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{termName}</p>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">Materials</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{materialsCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Available for you</p>
                </div>

                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">Bookmarks</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{bookmarksCount || 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Saved materials</p>
                </div>

                <Link
                  href="/results"
                  className="rounded-xl border border-border bg-background p-5 shadow-sm transition hover:border-blue-500/60"
                >
                  <p className="text-sm text-muted-foreground">Results</p>
                  <p className="mt-2 text-2xl sm:text-3xl font-semibold text-blue-600">{cardScoreText}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lastTerm ? `Term ${lastTerm.level_term_key} • ${totalPendingRetakes > 0 ? `${totalPendingRetakes} Retake` : "All Clear"}` : "Academic results"}
                  </p>
                </Link>

                <Link
                  href="/ranking"
                  className="rounded-xl border border-border bg-background p-5 shadow-sm transition hover:border-amber-500/60"
                >
                  <p className="text-sm text-muted-foreground">Ranking</p>
                  <p className="mt-2 text-2xl sm:text-3xl font-semibold text-amber-600">{cardRankText}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {myIdx >= 0 ? `Out of ${sortedBatch.length} in batch` : "Current position"}
                  </p>
                </Link>
              </section>

              {/* Notices */}
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Notices</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Recent academic notices relevant to you.</p>
                  </div>
                  <Link
                    href="/notifications"
                    className="w-fit rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    View Notifications
                  </Link>
                </div>

                <div className="mt-5">
                  {notices && notices.length > 0 ? (
                    <NoticeList categories={noticeCategories ?? []}>
                      <div className="divide-y divide-border">
                        {notices.map((notice) => (
                          <div
                            key={notice.id}
                            data-notice-search={`${notice.title} ${notice.content}`}
                            data-notice-category={notice.category_id ?? ""}
                            className="p-4 transition-colors hover:bg-muted/40"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-medium text-foreground">{notice.title}</h4>
                                  {notice.is_pinned && (
                                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                                      Pinned
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {new Intl.DateTimeFormat("en-US", {
                                    timeZone: "Asia/Dhaka",
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(notice.created_at))}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </NoticeList>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <p className="font-medium text-foreground">No notices yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">New academic notices relevant to you will appear here.</p>
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
