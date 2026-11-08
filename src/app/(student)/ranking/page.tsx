import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { Trophy, Medal, Award, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface RawResultRow {
  student_id: string | null;
  student_id_code: string | null;
  department_id: string;
  batch_id: string;
  level_term_key: string;
  gpa: number;
  cgpa: number | null;
  term_retake_count: number;
  remarks: string | null;
  status?: string | null;
}

interface RegisteredStudent {
  profile_id: string;
  student_id: string;
  full_name: string | null;
}

interface AirDropRecord {
  dropped_roll: string;
  from_batch?: string | null;
  junior_batch_assigned?: string | null;
  dropped_term?: string | null;
}

export default async function StudentRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const resolvedParams = await searchParams;
  const selectedTermFilter = resolvedParams.term || "overall";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, student_id, department_id, batch_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const rawClient = createRawSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: dept }, { data: batch }, { data: regStudentsRpc }, { data: allResultsData }, { data: airDropsData }] = await Promise.all([
    profile.department_id ? supabase.from("departments").select("name, code").eq("id", profile.department_id).maybeSingle() : Promise.resolve({ data: null }),
    profile.batch_id ? supabase.from("batches").select("name").eq("id", profile.batch_id).maybeSingle() : Promise.resolve({ data: null }),
    rawClient.rpc("get_registered_student_names"),
    rawClient.from("term_results").select("student_id, student_id_code, department_id, batch_id, level_term_key, gpa, cgpa, term_retake_count, remarks, status").order("level_term_key", { ascending: true }),
    rawClient.from("student_air_drop_history").select("dropped_roll, from_batch, junior_batch_assigned, dropped_term"),
  ]);

  const rollToAccountMap = new Map<string, { full_name: string; profile_id: string }>();
  const idToAccountMap = new Map<string, { full_name: string; student_id: string }>();

  ((regStudentsRpc || []) as RegisteredStudent[]).forEach((s) => {
    if (s.student_id) rollToAccountMap.set(s.student_id.trim().toLowerCase(), { full_name: s.full_name || "Student", profile_id: s.profile_id });
    if (s.profile_id) idToAccountMap.set(s.profile_id, { full_name: s.full_name || "Student", student_id: s.student_id || "" });
  });

  const airDropMap = new Map<string, string>();
  ((airDropsData || []) as AirDropRecord[]).forEach((d) => {
    if (d.dropped_roll) airDropMap.set(d.dropped_roll.trim(), d.junior_batch_assigned || "9th");
  });

  const allResults = (allResultsData || []) as RawResultRow[];
  const myRollClean = (profile.student_id || "").trim().toLowerCase();

  const myResultRow = allResults.find(
    (r) => r.student_id === user.id || (r.student_id_code && r.student_id_code.trim().toLowerCase() === myRollClean)
  );
  const targetBatchId = myResultRow?.batch_id || profile.batch_id;
  const targetDeptId = myResultRow?.department_id || profile.department_id;

  const batchResults = allResults.filter(
    (r) => (!targetBatchId || r.batch_id === targetBatchId) && (!targetDeptId || r.department_id === targetDeptId)
  );

  const availableTerms = Array.from(new Set(batchResults.map((r) => r.level_term_key))).sort();

  const prefixCounts = new Map<string, number>();
  batchResults.forEach((r) => {
    const rk = (r.student_id_code || "").trim();
    if (rk.length >= 3) prefixCounts.set(rk.slice(0, 3), (prefixCounts.get(rk.slice(0, 3)) || 0) + 1);
  });
  let regularPrefix = "";
  let maxCount = 0;
  prefixCounts.forEach((cnt, pfx) => { if (cnt > maxCount) { maxCount = cnt; regularPrefix = pfx; } });

  const targetRows = new Map<string, RawResultRow>();
  batchResults.forEach((r) => {
    const rollKey = (r.student_id_code || idToAccountMap.get(r.student_id || "")?.student_id || r.student_id || "").trim();
    if (!rollKey) return;

    if (selectedTermFilter !== "overall") {
      if (r.level_term_key === selectedTermFilter) targetRows.set(rollKey, { ...r, student_id_code: rollKey });
    } else {
      const existing = targetRows.get(rollKey);
      if (!existing || r.level_term_key >= existing.level_term_key) targetRows.set(rollKey, { ...r, student_id_code: rollKey });
    }
  });

  const leaderboard = Array.from(targetRows.values())
    .map((r) => {
      const rollStr = (r.student_id_code || "").trim();
      const accountInfo = rollToAccountMap.get(rollStr.toLowerCase()) || (r.student_id ? idToAccountMap.get(r.student_id) : undefined);
      const displayName = accountInfo ? accountInfo.full_name : null;
      const primaryScore = selectedTermFilter === "overall" ? (r.cgpa !== null && r.level_term_key !== "1-1" ? Number(r.cgpa) : Number(r.gpa)) : Number(r.gpa);
      const secondaryScore = Number(r.cgpa ?? r.gpa);

      let category: "regular" | "irregular" | "air_dropped" = "regular";
      let badgeLabel: string | null = null;
      let badgeColor: string = "";

      const isAirDropped = 
        airDropMap.has(rollStr) ||
        r.status === "air_dropped" ||
        Boolean(r.remarks && r.remarks.toLowerCase().includes("year drop"));

      if (isAirDropped) {
        category = "air_dropped";
        const targetJunior = airDropMap.get(rollStr) || "9th";
        badgeLabel = `Air Dropped → ${targetJunior} Batch`;
        badgeColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
      } else if (regularPrefix && rollStr.length >= 3 && !rollStr.startsWith(regularPrefix)) {
        category = "irregular";
        const yr = rollStr.slice(0, 2);
        const exBatch = yr === "23" ? "Ex-7th Batch" : yr === "22" ? "Ex-6th Batch" : "Senior Batch";
        badgeLabel = `Irregular • ${exBatch}`;
        badgeColor = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800";
      }

      return { 
        ...r, 
        roll_code: rollStr || "N/A", 
        displayName, 
        primaryScore, 
        secondaryScore,
        category,
        badgeLabel,
        badgeColor
      };
    })
    .sort((a, b) => {
      const catOrder = (cat: string) => (cat === "regular" ? 0 : cat === "irregular" ? 1 : 2);
      if (catOrder(a.category) !== catOrder(b.category)) {
        return catOrder(a.category) - catOrder(b.category);
      }
      if (b.primaryScore !== a.primaryScore) return b.primaryScore - a.primaryScore;
      if (b.secondaryScore !== a.secondaryScore) return b.secondaryScore - a.secondaryScore;
      return a.term_retake_count - b.term_retake_count;
    });

  let regularRankCounter = 0;
  const rankedLeaderboard = leaderboard.map((item) => {
    let rankDisplay = "";
    let isNumericRank = false;
    let numericRank: number | null = null;

    if (item.category === "regular") {
      regularRankCounter += 1;
      numericRank = regularRankCounter;
      rankDisplay = `#${regularRankCounter}`;
      isNumericRank = true;
    } else if (item.category === "irregular") {
      rankDisplay = "Irregular";
    } else {
      rankDisplay = "Unranked";
    }

    return {
      ...item,
      rankDisplay,
      isNumericRank,
      numericRank,
    };
  });

  const totalRegularCount = regularRankCounter;
  const myItem = rankedLeaderboard.find((item) => item.student_id === user.id || item.roll_code.toLowerCase() === myRollClean);
  const myRankText = myItem?.isNumericRank 
    ? `#${myItem.numericRank} of ${totalRegularCount}`
    : myItem?.rankDisplay || "Unranked";

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <StudentSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudentHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 text-xs font-semibold">
                <Trophy className="w-3.5 h-3.5" />
                Department & Batch Merit List
              </div>
              <h1 className="text-2xl font-bold">Academic Merit Ranking</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{dept?.name || "Department"} ({dept?.code || ""}) &bull; {batch?.name || "Batch"}</p>
            </div>
            <div className="rounded-xl border bg-amber-50/60 border-amber-200 px-5 py-3 text-center">
              <div className="text-[11px] font-semibold uppercase text-amber-800">
                {selectedTermFilter === "overall" ? "Overall Merit Position" : `Term ${selectedTermFilter} Rank`}
              </div>
              <div className="text-2xl font-extrabold text-amber-600 mt-0.5">{myRankText}</div>
            </div>
          </div>

          {availableTerms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-card border rounded-2xl p-3 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">Select Term Ranking:</span>
              <Link href="/ranking?term=overall" className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedTermFilter === "overall" ? "bg-blue-600 text-white shadow-sm" : "bg-muted/50 text-foreground hover:bg-muted"}`}>
                Overall (Latest CGPA)
              </Link>
              {availableTerms.map((tKey) => (
                <Link key={tKey} href={`/ranking?term=${tKey}`} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedTermFilter === tKey ? "bg-blue-600 text-white shadow-sm" : "bg-muted/50 text-foreground hover:bg-muted"}`}>
                  Level {tKey.split("-")[0]} Term {tKey.split("-")[1]} ({tKey})
                </Link>
              ))}
            </div>
          )}

          {rankedLeaderboard.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <h3 className="text-base font-bold">No Merit Ranking Data Available Yet</h3>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  {selectedTermFilter === "overall" ? `Overall Batch Merit Leaderboard (${totalRegularCount} Regular Students)` : `Term ${selectedTermFilter} Merit Leaderboard (${totalRegularCount} Regular Students)`}
                </h2>
                <span className="text-xs text-muted-foreground">{selectedTermFilter === "overall" ? "Sorted by Latest CGPA" : `Sorted by Term ${selectedTermFilter} GPA`}</span>
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
                      <th className="px-4 py-3">Retakes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rankedLeaderboard.map((row, idx) => {
                      const isMe = row.student_id === user.id || row.roll_code.toLowerCase() === myRollClean;
                      const isYearDropped = row.category === "air_dropped";
                      const retakeSubjects = row.remarks ? row.remarks.replace(/^Retakes:\s*/i, "").trim() : "";
                      return (
                        <tr key={row.roll_code + idx} className={isMe ? "bg-blue-50/70 dark:bg-blue-950/40 font-semibold" : isYearDropped ? "bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/50" : "hover:bg-muted/40"}>
                          <td className="px-4 py-3 font-bold">
                            {row.isNumericRank ? (
                              <span className="inline-flex items-center gap-1.5">
                                {row.numericRank === 1 && <Trophy className="w-4 h-4 text-amber-500" />}
                                {row.numericRank === 2 && <Medal className="w-4 h-4 text-slate-400" />}
                                {row.numericRank === 3 && <Award className="w-4 h-4 text-amber-700" />}
                                {row.rankDisplay}
                              </span>
                            ) : row.category === "irregular" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                Irregular
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                                Unranked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {row.displayName ? (
                                <span className="text-foreground font-medium">{row.displayName}</span>
                              ) : (
                                <span className="text-muted-foreground/60 italic text-xs">Not registered yet</span>
                              )}
                              {isMe && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold">
                                  You
                                </span>
                              )}
                              {row.badgeLabel && (
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${row.badgeColor}`}>
                                  {row.badgeLabel}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold">{row.roll_code}</td>
                          <td className="px-4 py-3">Term {row.level_term_key}</td>
                          <td className="px-4 py-3 font-semibold text-blue-600">{Number(row.gpa).toFixed(2)}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{row.level_term_key === "1-1" ? "1-1 Only" : Number(row.cgpa ?? row.gpa).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {isYearDropped ? (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 font-mono text-[10px] font-bold">Year Dropped</span>
                            ) : row.term_retake_count > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">{retakeSubjects || `${row.term_retake_count} Retake`}</span>
                            ) : (
                              <span className="text-emerald-600 text-xs font-medium">Clear</span>
                            )}
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