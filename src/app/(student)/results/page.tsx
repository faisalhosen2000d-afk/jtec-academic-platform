import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ShieldAlert,
  Trophy,
} from "lucide-react";

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

  const rawUserResults = allRows.filter(
    (r) => r.student_id === user.id || (r.student_id_code && r.student_id_code.trim().toLowerCase() === myRoll)
  );

  const passedTermKeys = new Set(
    rawUserResults.filter((r) => r.status !== "air_dropped" && Number(r.gpa) > 0).map((r) => r.level_term_key)
  );

  let seenDrop = false;
  const results: TermResultRecord[] = [];
  for (const r of rawUserResults) {
    if (r.status === "air_dropped") {
      if (passedTermKeys.has(r.level_term_key)) {
        continue;
      }
      if (!seenDrop) {
        seenDrop = true;
        results.push(r);
      } else {
        await rawClient.from("term_results").delete().eq("id", r.id);
      }
    } else {
      results.push(r);
    }
  }

  const passedResults = results.filter((r) => r.status !== "air_dropped");
  const latest = passedResults.length > 0 ? passedResults[passedResults.length - 1] : (results.length > 0 ? results[results.length - 1] : null);
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
  const latestCgpa = latest?.level_term_key === "1-1" ? null : latest?.cgpa ?? latest?.gpa ?? null;

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

          <main className="flex-1 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-6xl space-y-5">
              {/* Transcript Hero + 3 Compact KPIs */}
              <section className="dash-stagger-1 relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#091B1E] via-[#0A1120] to-[#070C17] p-5 sm:p-6 shadow-[0_0_36px_rgba(16,185,129,0.08)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Official Academic Transcript
                    </span>

                    <h1 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {profile.full_name}
                    </h1>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg border border-slate-800 bg-[#0B1324] px-2.5 py-1 font-mono text-slate-200">
                        ID: {profile.student_id || "N/A"}
                      </span>
                      <span className="rounded-lg border border-slate-800 bg-[#0B1324] px-2.5 py-1 text-slate-300">
                        {dept?.name || "Department"} {dept?.code ? `(${dept.code})` : ""}
                      </span>
                      <span className="rounded-lg border border-slate-800 bg-[#0B1324] px-2.5 py-1 text-slate-300">
                        {batch?.name || "Batch"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    <div className="rounded-xl border border-cyan-500/30 bg-[#0B1324]/90 px-3.5 py-2.5 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Latest GPA
                      </div>
                      <div className="mt-0.5 text-xl font-extrabold text-cyan-400 sm:text-2xl">
                        {latest ? Number(latest.gpa).toFixed(2) : "\u2014"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/35 bg-[#0B1324]/90 px-3.5 py-2.5 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        CGPA
                      </div>
                      <div className="mt-0.5 text-xl font-extrabold text-emerald-400 sm:text-2xl">
                        {latestCgpa !== null
                          ? Number(latestCgpa).toFixed(2)
                          : latest?.level_term_key === "1-1"
                            ? "1-1"
                            : "\u2014"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-violet-500/30 bg-[#0B1324]/90 px-3.5 py-2.5 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Terms
                      </div>
                      <div className="mt-0.5 text-xl font-extrabold text-violet-300 sm:text-2xl">
                        {passedResults.length}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Academic Standing & 5-Segment Retake Risk Gauge */}
              <section className="dash-stagger-2 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 shadow-xl space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isAirDropped || totalRetakes >= 4 ? (
                      <ShieldAlert className="h-4.5 w-4.5 animate-pulse text-rose-400" />
                    ) : totalRetakes > 0 ? (
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                    )}
                    <h2 className="font-serif text-sm font-bold text-white sm:text-base">
                      Academic Standing &amp; Retake Risk Meter
                    </h2>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${
                      isAirDropped || totalRetakes >= 5
                        ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                        : totalRetakes > 0
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {isAirDropped
                      ? "5 / 5 \u2014 YEAR DROPPED"
                      : `${totalRetakes} / ${riskCap} Retakes`}
                  </span>
                </div>

                {/* 5-Segment Gauge */}
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: riskCap }).map((_, idx) => {
                    const active = idx < Math.min(totalRetakes, riskCap);
                    const segClass = !active
                      ? "border-slate-800 bg-[#0E172A]"
                      : isAirDropped || totalRetakes >= 4
                        ? "border-rose-400/60 bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.35)]"
                        : "border-amber-400/60 bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.35)]";

                    return (
                      <div
                        key={idx}
                        className={`h-2 rounded-full border transition-all ${segClass}`}
                      />
                    );
                  })}
                </div>

                <p className="text-xs text-slate-400">
                  {isAirDropped
                    ? "CRITICAL STATUS: Year Drop confirmed. You have been migrated to the junior batch."
                    : totalRetakes === 0
                      ? "Clear academic standing! You have 0 pending retakes across your completed terms."
                      : `You currently have ${totalRetakes} unique uncleared retake subject(s). Accumulating 5 or more in a level triggers a Year Drop.`}
                </p>

                {/* Compact Term-wise Breakdown Chips */}
                {results.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
                    {results.map((r) => {
                      const isTermDropped = r.status === "air_dropped";
                      const freshList = termFreshMap.get(r.level_term_key) || [];
                      const allCodesInRemarks = getCodes(r.remarks);
                      const isNew = !isTermDropped && freshList.length > 0;
                      const isCarriedOnly =
                        !isTermDropped && allCodesInRemarks.length > 0 && !isNew;

                      return (
                        <div
                          key={r.id}
                          className={`inline-flex flex-wrap items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] ${
                            isTermDropped
                              ? "border-rose-500/35 bg-rose-500/10"
                              : isNew
                                ? "border-amber-500/35 bg-amber-500/10"
                                : "border-emerald-500/30 bg-emerald-500/10"
                          }`}
                        >
                          <span className="font-bold text-white">
                            {r.level_term_key}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isTermDropped
                                ? "bg-rose-500/20 text-rose-300"
                                : isNew
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {isTermDropped
                              ? "Year Dropped"
                              : isNew
                                ? `${freshList.length} New`
                                : isCarriedOnly
                                  ? "Carried Over"
                                  : "All Clear"}
                          </span>
                          {isNew &&
                            freshList.map((c, i) => (
                              <span
                                key={i}
                                className="rounded border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200"
                              >
                                {c}
                              </span>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Compact 3-Column Term Examination Cards */}
              {results.length === 0 ? (
                <section className="dash-stagger-2 rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/70 p-12 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
                  <h3 className="mt-3 font-serif text-base font-bold text-white">
                    No Published Term Results Yet
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Your semester results will appear here once published.
                  </p>
                </section>
              ) : (
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((r, index) => {
                    const is11 = r.level_term_key === "1-1";
                    const [lvl, trm] = r.level_term_key.split("-");
                    const allCodes = getCodes(r.remarks);
                    const freshList = termFreshMap.get(r.level_term_key) || [];
                    const rkInfo = getRank(r.level_term_key);
                    const isDropped = r.status === "air_dropped";
                    const isTermAllPassed = freshList.length === 0;
                    const gpaPct = Math.min(
                      100,
                      Math.max(0, (Number(r.gpa) / 4) * 100),
                    );

                    return (
                      <article
                        key={r.id}
                        style={{
                          animation: "dashFadeUp 0.42s ease-out both",
                          animationDelay: `${Math.min(index, 11) * 55 + 140}ms`,
                        }}
                        className={`flex flex-col justify-between gap-3 rounded-2xl border bg-[#0A1020] p-4 shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${
                          isDropped
                            ? "border-rose-500/35 hover:border-rose-400/60"
                            : isTermAllPassed
                              ? "border-emerald-500/25 hover:border-emerald-400/55"
                              : "border-amber-500/30 hover:border-amber-400/60"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-cyan-300">
                              Level {lvl} &bull; Term {trm}
                            </span>

                            {rkInfo.rank && !isDropped && (
                              <Link
                                href={`/ranking?term=${r.level_term_key}`}
                                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-500/20"
                              >
                                <Trophy className="h-3 w-3" />#{rkInfo.rank} /{" "}
                                {rkInfo.total}
                              </Link>
                            )}
                          </div>

                          {/* Title & Status */}
                          <div>
                            <h3 className="font-serif text-base font-bold text-white">
                              Term {r.level_term_key} Exam
                            </h3>
                            <p
                              className={`mt-0.5 text-[11px] font-semibold ${
                                isDropped
                                  ? "text-rose-400"
                                  : isTermAllPassed
                                    ? "text-emerald-400"
                                    : "text-amber-300"
                              }`}
                            >
                              {isDropped
                                ? "Year Dropped"
                                : isTermAllPassed
                                  ? "Promoted (Term Cleared)"
                                  : `Promoted (${freshList.length} New Retake)`}
                            </p>
                          </div>

                          {/* Compact Inline GPA / CGPA Strip */}
                          <div className="grid grid-cols-2 divide-x divide-slate-800 rounded-xl border border-slate-800/90 bg-[#0E172A] py-2 text-center">
                            <div>
                              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                                Term GPA
                              </div>
                              <div className="mt-0.5 text-lg font-extrabold text-cyan-400">
                                {Number(r.gpa).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                                CGPA
                              </div>
                              <div className="mt-0.5 text-lg font-extrabold text-emerald-400">
                                {is11 ? (
                                  <span className="text-xs font-semibold text-slate-500">
                                    N/A (1-1)
                                  </span>
                                ) : (
                                  Number(r.cgpa ?? r.gpa).toFixed(2)
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Mini GPA Scale Bar */}
                          {!isDropped && (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0E172A]">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                                  style={{ width: `${gpaPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {Number(r.gpa).toFixed(2)} / 4.0
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Compact Footer */}
                        {allCodes.length > 0 ? (
                          <div
                            className={`rounded-xl border px-3 py-2 text-[11px] space-y-1.5 ${
                              isTermAllPassed
                                ? "border-emerald-500/25 bg-emerald-500/8"
                                : "border-amber-500/30 bg-amber-500/8"
                            }`}
                          >
                            <div
                              className={`flex items-center gap-1.5 font-semibold ${
                                isTermAllPassed
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                              }`}
                            >
                              {isTermAllPassed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span>
                                {isTermAllPassed
                                  ? "Cleared (Prior Backlog):"
                                  : "Retakes in Record:"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {allCodes.map((c, idx) => {
                                const origin = subjectOriginTerm.get(c);
                                const isCarriedOver =
                                  origin && origin !== r.level_term_key;

                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                      isCarriedOver
                                        ? "border-slate-700 bg-slate-800/80 text-slate-300"
                                        : "border-amber-500/40 bg-amber-500/20 text-amber-200"
                                    }`}
                                  >
                                    <span>{c}</span>
                                    <span className="text-[9px] font-normal opacity-80">
                                      {isCarriedOver
                                        ? `(${origin})`
                                        : "(New)"}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : isDropped ? (
                          <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              Year Dropped &bull; {batch?.name || "Junior"} Batch
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-[11px] font-medium text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>All subjects passed</span>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}