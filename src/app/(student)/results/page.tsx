import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { GraduationCap, AlertTriangle, CheckCircle2, BookOpen, ShieldAlert, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

interface TermResultRecord {
  id: string;
  student_id: string | null;
  student_id_code: string | null;
  department_id: string;
  batch_id: string;
  level_term_key: string;
  gpa: number;
  cgpa: number | null;
  term_retake_count: number;
  status: string;
  remarks: string | null;
}

function getCodes(remarks: string | null): string[] {
  if (!remarks) return [];
  const c = remarks.replace(/^Retakes:\s*/i, "").trim();
  if (!c || c === "0" || c.toLowerCase() === "none" || c.startsWith("Year Dropped")) return [];
  return c
    .split(/[,;|]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export default async function StudentResultsPage() {
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

  const [{ data: dept }, { data: batch }, { data: rowsData }] = await Promise.all([
    profile.department_id ? supabase.from("departments").select("name, code").eq("id", profile.department_id).maybeSingle() : Promise.resolve({ data: null }),
    profile.batch_id ? supabase.from("batches").select("name").eq("id", profile.batch_id).maybeSingle() : Promise.resolve({ data: null }),
    rawClient.from("term_results").select("id, student_id, student_id_code, department_id, batch_id, level_term_key, gpa, cgpa, term_retake_count, status, remarks").order("level_term_key", { ascending: true }),
  ]);

  const allRows = (rowsData || []) as TermResultRecord[];
  const myRoll = (profile.student_id || "").trim().toLowerCase();

  const results = allRows.filter(
    (r) => r.student_id === user.id || (r.student_id_code && r.student_id_code.trim().toLowerCase() === myRoll)
  );

  const latest = results.length > 0 ? results[results.length - 1] : null;
  const tBatch = latest?.batch_id || profile.batch_id;
  const tDept = latest?.department_id || profile.department_id;

  const peers = allRows.filter((r) => (!tBatch || r.batch_id === tBatch) && (!tDept || r.department_id === tDept));

  const pfxMap = new Map<string, number>();
  peers.forEach((r) => {
    const k = (r.student_id_code || "").trim();
    if (k.length >= 3) pfxMap.set(k.slice(0, 3), (pfxMap.get(k.slice(0, 3)) || 0) + 1);
  });
  let regPfx = "";
  let maxC = 0;
  pfxMap.forEach((c, p) => { if (c > maxC) { maxC = c; regPfx = p; } });

  const getRank = (tKey: string) => {
    const list = peers
      .filter((r) => r.level_term_key === tKey && (!regPfx || !(r.student_id_code || "").trim().startsWith(regPfx) === false))
      .sort((a, b) => (Number(b.gpa) !== Number(a.gpa) ? Number(b.gpa) - Number(a.gpa) : (a.term_retake_count || 0) - (b.term_retake_count || 0)));
    const idx = list.findIndex((x) => x.student_id === user.id || (x.student_id_code && x.student_id_code.trim().toLowerCase() === myRoll));
    return { rank: idx >= 0 ? idx + 1 : null, total: list.length };
  };

  // Map each subject to the earliest term in which it was first incurred!
  const subjectOriginTerm = new Map<string, string>();
  const termFreshMap = new Map<string, string[]>();

  results.forEach((r) => {
    if (r.status === "air_dropped") return;
    const codes = getCodes(r.remarks);
    const freshForThisTerm: string[] = [];

    codes.forEach((code) => {
      if (!subjectOriginTerm.has(code)) {
        subjectOriginTerm.set(code, r.level_term_key);
        freshForThisTerm.push(code);
      }
    });
    termFreshMap.set(r.level_term_key, freshForThisTerm);
  });

  const isAirDropped = results.some((r) => r.status === "air_dropped");
  const totalRetakes = isAirDropped ? 5 : subjectOriginTerm.size;
  const riskCap = 5;
  const pct = Math.min(100, Math.round((totalRetakes / riskCap) * 100));
  const latestCgpa = latest?.level_term_key === "1-1" ? null : latest?.cgpa ?? latest?.gpa ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <StudentSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudentHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                <GraduationCap className="w-3.5 h-3.5" /> Official Academic Transcript
              </div>
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                ID: {profile.student_id || "N/A"} &bull; {dept?.name || "Department"} ({dept?.code || ""}) &bull; {batch?.name || "Batch"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center min-w-[110px]">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Latest GPA</div>
                <div className="text-2xl font-bold text-blue-600 mt-0.5">{latest ? Number(latest.gpa).toFixed(2) : "—"}</div>
              </div>
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center min-w-[110px]">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Cumulative CGPA</div>
                <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                  {latestCgpa !== null ? Number(latestCgpa).toFixed(2) : latest?.level_term_key === "1-1" ? "1-1 Only" : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Standing & Risk Meter */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAirDropped || totalRetakes >= 4 ? (
                  <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
                ) : totalRetakes > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <h2 className="text-base font-bold">Academic Standing & Retake Risk Meter</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${isAirDropped || totalRetakes >= 5 ? "bg-red-100 text-red-700" : totalRetakes > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                {isAirDropped ? "5 / 5 — YEAR DROPPED" : `${totalRetakes} / ${riskCap} Retakes`}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${isAirDropped || totalRetakes >= 4 ? "bg-red-600" : totalRetakes >= 2 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: totalRetakes === 0 ? "0%" : `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {isAirDropped
                ? "CRITICAL STATUS: Year Drop confirmed. You have been migrated to the junior batch."
                : totalRetakes === 0
                ? "Clear academic standing! You have 0 pending retakes across your completed terms."
                : `You currently have ${totalRetakes} unique uncleared retake subject(s). Accumulating 5 or more in a level triggers a Year Drop.`}
            </p>

            {/* Term-wise Retake Breakdown with Green styling when no new retakes */}
            {results.length > 0 && (
              <div className="pt-3 border-t space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Term-wise Retake Breakdown</div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {results.map((r) => {
                    const freshList = termFreshMap.get(r.level_term_key) || [];
                    const allCodesInRemarks = getCodes(r.remarks);
                    const isNew = freshList.length > 0;
                    const isCarriedOnly = allCodesInRemarks.length > 0 && !isNew;
                    const isCleanTerm = freshList.length === 0;

                    return (
                      <div
                        key={r.id}
                        className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                          isNew
                            ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                            : isCarriedOnly
                            ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/60"
                            : "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 font-bold">
                          <span className="whitespace-nowrap shrink-0">Term {r.level_term_key}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-md whitespace-nowrap ${
                            isNew
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                              : isCarriedOnly
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                          }`}>
                            {isNew ? `${freshList.length} New Retake` : isCarriedOnly ? "Carried Over" : "All Clear"}
                          </span>
                        </div>
                        {isNew ? (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {freshList.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono font-bold text-[10px]">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : isCarriedOnly ? (
                          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                            No new retake in {r.level_term_key} &bull; Prior: {allCodesInRemarks.join(", ")}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">All subjects passed (--)</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Term-by-Term Cards with clear Carried vs New Badges */}
          {results.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <h3 className="text-base font-bold">No Published Term Results Yet</h3>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r) => {
                const is11 = r.level_term_key === "1-1";
                const [lvl, trm] = r.level_term_key.split("-");
                const allCodes = getCodes(r.remarks);
                const freshList = termFreshMap.get(r.level_term_key) || [];
                const rkInfo = getRank(r.level_term_key);
                const isDropped = r.status === "air_dropped";
                const isTermAllPassed = freshList.length === 0;

                return (
                  <div key={r.id} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <span className="text-xs font-semibold uppercase text-blue-600">Level {lvl} &bull; Term {trm}</span>
                        <h3 className="text-lg font-bold mt-0.5">Term {r.level_term_key} Examination</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isDropped
                              ? "bg-red-100 text-red-700 font-bold"
                              : isTermAllPassed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isDropped
                            ? "Year Dropped"
                            : isTermAllPassed
                            ? "Promoted (Term Cleared)"
                            : `Promoted (${freshList.length} New Retake)`}
                        </span>
                        {rkInfo.rank && !isDropped && (
                          <Link href={`/ranking?term=${r.level_term_key}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:underline">
                            <Trophy className="w-3 h-3" /> Term Rank: #{rkInfo.rank} of {rkInfo.total}
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3.5">
                        <div className="text-[11px] text-blue-700 font-semibold uppercase">Term GPA</div>
                        <div className="text-2xl font-extrabold text-blue-600 mt-0.5">{Number(r.gpa).toFixed(2)}</div>
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3.5">
                        <div className="text-[11px] text-emerald-700 font-semibold uppercase">CGPA</div>
                        <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                          {is11 ? <span className="text-sm font-semibold text-muted-foreground">N/A (1-1)</span> : Number(r.cgpa ?? r.gpa).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Subject Badges with exact Origin Term and Carried distinction */}
                    {allCodes.length > 0 ? (
                      <div
                        className={`p-3.5 rounded-xl border space-y-2 ${
                          isTermAllPassed
                            ? "bg-emerald-50/30 border-emerald-200/80 dark:bg-emerald-950/10 dark:border-emerald-900/40"
                            : "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                        }`}
                      >
                        <div className="text-[11px] font-bold flex items-center justify-between">
                          <span className={`flex items-center gap-1.5 ${isTermAllPassed ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
                            {isTermAllPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            <span>{isTermAllPassed ? "All Term Subjects Cleared (Prior Backlog Pending):" : `Retake Subjects in Record:`}</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {allCodes.map((c, idx) => {
                            const origin = subjectOriginTerm.get(c);
                            const isCarriedOver = origin && origin !== r.level_term_key;

                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono text-[11px] font-bold ${
                                  isCarriedOver
                                    ? "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    : "bg-amber-200 text-amber-950 border border-amber-300 dark:bg-amber-900 dark:text-amber-100"
                                }`}
                              >
                                <span>{c}</span>
                                {isCarriedOver ? (
                                  <span className="text-[9px] font-normal text-muted-foreground uppercase">(from {origin})</span>
                                ) : (
                                  <span className="text-[9px] font-semibold text-amber-900 dark:text-amber-200 uppercase">(New)</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>No retake subjects in Term {r.level_term_key} (All Passed)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}