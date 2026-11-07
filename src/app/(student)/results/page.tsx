import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { GraduationCap, AlertTriangle, CheckCircle2, BookOpen, ShieldAlert, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

interface TermResultRecord {
  id: string;
  level_term_key: string;
  gpa: number;
  cgpa: number | null;
  earned_credits: number;
  term_retake_count: number;
  cumulative_retake_count: number;
  status: "passed" | "promoted_with_retake" | "air_dropped";
  remarks: string | null;
  published_at: string;
}

export default async function StudentResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, student_id, email, role, department_id, batch_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const rawClient = createRawSupabaseClient(supabaseUrl, serviceKey);

  const [
    { data: dept },
    { data: batch },
    { data: rawResults },
  ] = await Promise.all([
    profile.department_id
      ? supabase.from("departments").select("name, code").eq("id", profile.department_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.batch_id
      ? supabase.from("batches").select("name").eq("id", profile.batch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    rawClient
      .from("term_results")
      .select("id, level_term_key, gpa, cgpa, earned_credits, term_retake_count, cumulative_retake_count, status, remarks, published_at")
      .eq("student_id", user.id)
      .order("level_term_key", { ascending: true }),
  ]);

  const results = (rawResults || []) as TermResultRecord[];
  const latestResult = results.length > 0 ? results[results.length - 1] : null;

  // Calculate Retake Risk Meter (Out of 5 retakes in current level)
  const totalRetakes = results.reduce((acc, r) => acc + (Number(r.term_retake_count) || 0), 0);
  const riskCap = 5;
  const riskPercent = Math.min(100, Math.round((totalRetakes / riskCap) * 100));

  const latestCgpa =
    latestResult?.level_term_key === "1-1"
      ? null
      : latestResult?.cgpa ?? latestResult?.gpa ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <StudentSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudentHeader />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                <GraduationCap className="w-3.5 h-3.5" />
                Official Academic Transcript
              </div>
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                ID: {profile.student_id || "N/A"} &bull; {dept?.name || "Department"} ({dept?.code || ""}) &bull; {batch?.name || "Batch"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center min-w-[110px]">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Latest GPA</div>
                <div className="text-2xl font-bold text-blue-600 mt-0.5">
                  {latestResult ? Number(latestResult.gpa).toFixed(2) : "—"}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center min-w-[110px]">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Cumulative CGPA</div>
                <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                  {latestCgpa !== null ? Number(latestCgpa).toFixed(2) : latestResult?.level_term_key === "1-1" ? "1-1 Only" : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Retake & Air Drop Risk Meter */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {totalRetakes >= 4 ? (
                  <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
                ) : totalRetakes > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <h2 className="text-base font-bold">Academic Standing & Retake Risk Meter</h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  totalRetakes >= 5
                    ? "bg-red-100 text-red-700"
                    : totalRetakes >= 3
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {totalRetakes} / {riskCap} Retakes
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  totalRetakes >= 4
                    ? "bg-red-600"
                    : totalRetakes >= 2
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: totalRetakes === 0 ? "0%" : `${Math.max(8, riskPercent)}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {totalRetakes === 0
                ? "Clear academic standing! You have 0 pending retakes across your completed terms."
                : totalRetakes >= 5
                ? "Critical threshold reached (5 or more retakes). According to JTEC academic rules, 5+ retakes in a level results in a Year Drop to the next junior batch."
                : `You currently have ${totalRetakes} retake subject(s). Accumulating 5 or more retakes in a level or missing a final practical lab triggers a Year Drop.`}
            </p>
          </div>

          {/* Term-by-Term Result Cards */}
          {results.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <h3 className="text-base font-bold">No Published Term Results Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your term results will appear here automatically once the examination office publishes the official result sheet for your batch.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r) => {
                const is11 = r.level_term_key === "1-1";
                const [lvl, trm] = r.level_term_key.split("-");
                return (
                  <div key={r.id} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 hover:border-blue-500/50 transition">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                          Level {lvl} &bull; Term {trm}
                        </span>
                        <h3 className="text-lg font-bold mt-0.5">Term {r.level_term_key} Examination</h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === "passed"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "promoted_with_retake"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.status === "passed"
                          ? "Passed"
                          : r.status === "promoted_with_retake"
                          ? `Promoted (${r.term_retake_count} Retake)`
                          : "Year Dropped"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-3.5">
                        <div className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wider">Term GPA</div>
                        <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                          {Number(r.gpa).toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3.5">
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">CGPA</div>
                        <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {is11 ? (
                            <span className="text-sm font-semibold text-muted-foreground">N/A (1-1)</span>
                          ) : r.cgpa !== null ? (
                            Number(r.cgpa).toFixed(2)
                          ) : (
                            Number(r.gpa).toFixed(2)
                          )}
                        </div>
                      </div>
                    </div>

                    {is11 && (
                      <div className="text-[11px] text-muted-foreground bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Level 1 Term 1 displays Term GPA only. Cumulative CGPA begins from Level 1 Term 2 (1-2).</span>
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