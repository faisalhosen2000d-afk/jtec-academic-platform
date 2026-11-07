import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { Trophy, Medal, Award, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface RawRankingRow {
  student_id: string;
  level_term_key: string;
  gpa: number;
  cgpa: number | null;
  earned_credits: number;
  term_retake_count: number;
}

export default async function StudentRankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, student_id, department_id, batch_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const rawClient = createRawSupabaseClient(supabaseUrl, serviceKey);

  // Fetch all students and published term results for merit comparison
  const [
    { data: dept },
    { data: batch },
    { data: allProfiles },
    { data: allResultsData },
  ] = await Promise.all([
    profile.department_id
      ? supabase.from("departments").select("name, code").eq("id", profile.department_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.batch_id
      ? supabase.from("batches").select("name").eq("id", profile.batch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    rawClient
      .from("profiles")
      .select("id, full_name, student_id, batch_id, department_id")
      .eq("role", "student"),
    rawClient
      .from("term_results")
      .select("student_id, department_id, batch_id, level_term_key, gpa, cgpa, earned_credits, term_retake_count")
      .order("level_term_key", { ascending: true }),
  ]);

  const allResults = (allResultsData || []) as Array<{
    student_id: string;
    department_id: string;
    batch_id: string;
    level_term_key: string;
    gpa: number;
    cgpa: number | null;
    earned_credits: number;
    term_retake_count: number;
  }>;

  const userLatest = allResults.filter((r) => r.student_id === user.id).pop();
  const targetBatchId = userLatest?.batch_id || profile.batch_id;
  const targetDeptId = userLatest?.department_id || profile.department_id;

  const batchResults = allResults.filter(
    (r) => (!targetBatchId || r.batch_id === targetBatchId) && (!targetDeptId || r.department_id === targetDeptId)
  );

  const batchProfiles = (allProfiles || []).filter(
    (p: { id: string; full_name: string | null; student_id: string | null; batch_id: string | null; department_id: string | null }) => (!targetBatchId || p.batch_id === targetBatchId) && (!targetDeptId || p.department_id === targetDeptId)
  );

  const profileMap = new Map<string, { full_name: string; student_id: string }>();
  (batchProfiles || []).forEach((p: { id: string; full_name: string | null; student_id: string | null }) => {
    profileMap.set(p.id, {
      full_name: p.full_name || "Student",
      student_id: p.student_id || "N/A",
    });
  });

  // Aggregate latest GPA/CGPA per student in the batch
  const latestByStudent = new Map<string, RawRankingRow>();
  ((batchResults || []) as RawRankingRow[]).forEach((r) => {
    const existing = latestByStudent.get(r.student_id);
    if (!existing || r.level_term_key >= existing.level_term_key) {
      latestByStudent.set(r.student_id, r);
    }
  });

  const leaderboard = Array.from(latestByStudent.values())
    .map((r) => {
      const studentInfo = profileMap.get(r.student_id) || { full_name: "Student", student_id: "N/A" };
      const score = r.cgpa !== null && r.level_term_key !== "1-1" ? Number(r.cgpa) : Number(r.gpa);
      return {
        ...r,
        full_name: studentInfo.full_name,
        student_id_code: studentInfo.student_id,
        rankingScore: score,
      };
    })
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      return a.term_retake_count - b.term_retake_count;
    });

  const myRankIndex = leaderboard.findIndex((item) => item.student_id === user.id);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <StudentSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudentHeader />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                <Trophy className="w-3.5 h-3.5" />
                Department & Batch Merit List
              </div>
              <h1 className="text-2xl font-bold">Academic Merit Ranking</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {dept?.name || "Department"} ({dept?.code || ""}) &bull; {batch?.name || "Batch"}
              </p>
            </div>

            <div className="rounded-xl border bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 px-5 py-3 text-center">
              <div className="text-[11px] font-semibold uppercase text-amber-800 dark:text-amber-300">Your Merit Position</div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {myRank ? `#${myRank} of ${leaderboard.length}` : "Unranked"}
              </div>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <h3 className="text-base font-bold">No Merit Ranking Data Available Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Merit positions are computed automatically as soon as term results are published for your batch and department.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b flex items-center justify-between">
                <h2 className="text-sm font-bold">Batch Merit Leaderboard ({leaderboard.length} Students)</h2>
                <span className="text-xs text-muted-foreground">Sorted by CGPA / Term GPA</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Term</th>
                      <th className="px-4 py-3">Term GPA</th>
                      <th className="px-4 py-3">CGPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaderboard.map((row, idx) => {
                      const rank = idx + 1;
                      const isMe = row.student_id === user.id;
                      return (
                        <tr
                          key={row.student_id}
                          className={`${
                            isMe ? "bg-blue-50/70 dark:bg-blue-950/40 font-semibold" : "hover:bg-muted/40"
                          }`}
                        >
                          <td className="px-4 py-3 font-bold">
                            <span className="inline-flex items-center gap-1.5">
                              {rank === 1 && <Trophy className="w-4 h-4 text-amber-500" />}
                              {rank === 2 && <Medal className="w-4 h-4 text-slate-400" />}
                              {rank === 3 && <Award className="w-4 h-4 text-amber-700" />}
                              #{rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {row.full_name}
                            {isMe && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">
                                You
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{row.student_id_code}</td>
                          <td className="px-4 py-3">Term {row.level_term_key}</td>
                          <td className="px-4 py-3 font-semibold text-blue-600">{Number(row.gpa).toFixed(2)}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">
                            {row.level_term_key === "1-1" ? "1-1 Only" : Number(row.cgpa ?? row.gpa).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}