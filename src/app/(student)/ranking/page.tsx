import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
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

function formatOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function StudentAvatar({
  name,
  avatarUrl,
  size = "sm",
}: {
  name: string | null;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-10 w-10 text-xs" : "h-8 w-8 text-[11px]";
  const initial = (name || "S").trim().charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Student"}
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-slate-700`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-bold text-slate-200`}
    >
      {initial}
    </div>
  );
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

  const [
    { data: dept },
    { data: batch },
    { data: regStudentsRpc },
    { data: avatarRows },
    { data: allResultsData },
    { data: airDropsData },
  ] = await Promise.all([
    profile.department_id
      ? supabase.from("departments").select("name, code").eq("id", profile.department_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.batch_id
      ? supabase.from("batches").select("name").eq("id", profile.batch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    rawClient.rpc("get_registered_student_names"),
    (() => {
      let pq = rawClient.from("profiles").select("id, student_id, avatar_url");
      if (profile.department_id) pq = pq.eq("department_id", profile.department_id);
      return pq;
    })(),
    (() => {
      let q = rawClient
        .from("term_results")
        .select("student_id, student_id_code, department_id, batch_id, level_term_key, gpa, cgpa, term_retake_count, remarks, status")
        .order("level_term_key", { ascending: true })
        .limit(5000);
      if (profile.department_id) q = q.eq("department_id", profile.department_id);
      if (profile.batch_id) q = q.eq("batch_id", profile.batch_id);
      return q;
    })(),
    rawClient.from("student_air_drop_history").select("dropped_roll, from_batch, junior_batch_assigned, dropped_term"),
  ]);

  const avatarById = new Map<string, string | null>();
  const avatarByRoll = new Map<string, string | null>();
  ((avatarRows || []) as Array<{ id: string; student_id: string | null; avatar_url: string | null }>).forEach((p) => {
    if (p.id) avatarById.set(p.id, p.avatar_url);
    if (p.student_id) avatarByRoll.set(p.student_id.trim().toLowerCase(), p.avatar_url);
  });

  const rollToAccountMap = new Map<string, { full_name: string; profile_id: string }>();
  const idToAccountMap = new Map<string, { full_name: string; student_id: string }>();

  ((regStudentsRpc || []) as RegisteredStudent[]).forEach((s) => {
    if (s.student_id) {
      rollToAccountMap.set(s.student_id.trim().toLowerCase(), {
        full_name: s.full_name || "Student",
        profile_id: s.profile_id,
      });
    }
    if (s.profile_id) {
      idToAccountMap.set(s.profile_id, {
        full_name: s.full_name || "Student",
        student_id: s.student_id || "",
      });
    }
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
  const targetBatchId = profile.batch_id || myResultRow?.batch_id;
  const targetDeptId = profile.department_id || myResultRow?.department_id;

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
  prefixCounts.forEach((cnt, pfx) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      regularPrefix = pfx;
    }
  });

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
      const rollLower = rollStr.toLowerCase();
      const accountInfo = rollToAccountMap.get(rollLower) || (r.student_id ? idToAccountMap.get(r.student_id) : undefined);
      const displayName = accountInfo ? accountInfo.full_name : null;
      const avatarUrl =
        avatarByRoll.get(rollLower) ||
        (r.student_id ? avatarById.get(r.student_id) : null) ||
        null;

      const primaryScore =
        selectedTermFilter === "overall"
          ? r.cgpa !== null && r.level_term_key !== "1-1"
            ? Number(r.cgpa)
            : Number(r.gpa)
          : Number(r.gpa);
      const secondaryScore = Number(r.cgpa ?? r.gpa);

      let category: "regular" | "irregular" | "air_dropped" = "regular";
      let badgeLabel: string | null = null;
      let badgeColor = "";

      const isAirDropped =
        airDropMap.has(rollStr) ||
        r.status === "air_dropped" ||
        Boolean(r.remarks && r.remarks.toLowerCase().includes("year drop"));

      if (isAirDropped) {
        category = "air_dropped";
        const targetJunior = airDropMap.get(rollStr) || "9th";
        badgeLabel = `Air Dropped \u2192 ${targetJunior} Batch`;
        badgeColor = "border-rose-500/35 bg-rose-500/15 text-rose-300";
      } else if (regularPrefix && rollStr.length >= 3 && !rollStr.startsWith(regularPrefix)) {
        category = "irregular";
        const yr = rollStr.slice(0, 2);
        const exBatch = yr === "23" ? "Ex-7th Batch" : yr === "22" ? "Ex-6th Batch" : "Senior Batch";
        badgeLabel = `Irregular \u2022 ${exBatch}`;
        badgeColor = "border-purple-500/35 bg-purple-500/15 text-purple-300";
      }

      return {
        ...r,
        roll_code: rollStr || "N/A",
        displayName,
        avatarUrl,
        primaryScore,
        secondaryScore,
        category,
        badgeLabel,
        badgeColor,
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
      rankDisplay = formatOrdinal(regularRankCounter);
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
  const myRankText =
    myItem?.isNumericRank && myItem.numericRank
      ? `${formatOrdinal(myItem.numericRank)} of ${totalRegularCount}`
      : myItem?.rankDisplay || "Unranked";

  const topThree = rankedLeaderboard.filter(
    (item) => item.isNumericRank && item.numericRank !== null && item.numericRank <= 3
  );

  return (
    <div className="min-h-full bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
        .dash-stagger-3 { animation: dashFadeUp 0.45s ease-out 0.16s both; }
      `}</style>
      <div className="flex min-h-full">

        <div className="flex min-w-0 flex-1 flex-col">

          <main className="flex-1 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-6xl space-y-5">
              {/* Merit Hero Banner */}
              <section className="dash-stagger-1 relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#18140C] via-[#0A1120] to-[#070C17] p-5 sm:p-6 shadow-[0_0_36px_rgba(245,158,11,0.08)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
                      <Trophy className="h-3.5 w-3.5" />
                      Department &amp; Batch Merit List
                    </span>

                    <h1 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Academic Merit Ranking
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                      {dept?.name || "Department"} {dept?.code ? `(${dept.code})` : ""} &bull; {batch?.name || "Batch"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-500/35 bg-[#0B1324]/90 px-5 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      {selectedTermFilter === "overall" ? "Overall Merit Position" : `Term ${selectedTermFilter} Rank`}
                    </div>
                    <div className="mt-0.5 text-2xl font-extrabold text-white">
                      {myRankText}
                    </div>
                  </div>
                </div>
              </section>

              {/* Top 3 Podium Spotlight with Profile Photos */}
              {topThree.length > 0 && (
                <section className="dash-stagger-2 grid gap-3 sm:grid-cols-3">
                  {topThree.map((top) => {
                    const rank = top.numericRank ?? 1;
                    const cardTheme =
                      rank === 1
                        ? "border-amber-400/45 bg-gradient-to-br from-amber-500/12 via-[#0A1020] to-[#0A1020]"
                        : rank === 2
                          ? "border-slate-400/35 bg-gradient-to-br from-slate-400/10 via-[#0A1020] to-[#0A1020]"
                          : "border-amber-600/35 bg-gradient-to-br from-amber-700/10 via-[#0A1020] to-[#0A1020]";

                    const badgeTheme =
                      rank === 1
                        ? "border-amber-400/40 bg-amber-400/20 text-amber-300"
                        : rank === 2
                          ? "border-slate-400/35 bg-slate-400/15 text-slate-200"
                          : "border-amber-600/40 bg-amber-600/20 text-amber-400";

                    return (
                      <div
                        key={top.roll_code}
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-lg ${cardTheme}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-extrabold ${badgeTheme}`}>
                            {rank === 1 ? <Trophy className="h-4 w-4" /> : formatOrdinal(rank)}
                          </div>
                          <StudentAvatar name={top.displayName} avatarUrl={top.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                              {top.displayName || "Not registered"}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {top.roll_code}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {selectedTermFilter === "overall" ? "CGPA" : "GPA"}
                          </div>
                          <div className="text-lg font-extrabold text-emerald-400">
                            {top.primaryScore.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {/* Term Filter Pills */}
              {availableTerms.length > 0 && (
                <section className="dash-stagger-2 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-3 shadow-lg">
                  <span className="px-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Select Term:
                  </span>
                  <Link
                    href="/ranking?term=overall"
                    className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                      selectedTermFilter === "overall"
                        ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#0E172A] text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    Overall (Latest CGPA)
                  </Link>
                  {availableTerms.map((tKey) => (
                    <Link
                      key={tKey}
                      href={`/ranking?term=${tKey}`}
                      className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                        selectedTermFilter === tKey
                          ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#0E172A] text-slate-300 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      Level {tKey.split("-")[0]} Term {tKey.split("-")[1]} ({tKey})
                    </Link>
                  ))}
                </section>
              )}

              {/* Full Leaderboard Table */}
              {rankedLeaderboard.length === 0 ? (
                <section className="dash-stagger-3 rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/70 p-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-slate-500" />
                  <h3 className="mt-3 font-serif text-base font-bold text-white">
                    No Merit Ranking Data Available Yet
                  </h3>
                </section>
              ) : (
                <section className="dash-stagger-3 overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 px-5 py-3.5">
                    <h2 className="font-serif text-sm font-bold text-white sm:text-base">
                      {selectedTermFilter === "overall"
                        ? `Overall Batch Merit Leaderboard (${totalRegularCount} Regular Students)`
                        : `Term ${selectedTermFilter} Merit Leaderboard (${totalRegularCount} Regular Students)`}
                    </h2>
                    <span className="text-xs text-slate-400">
                      {selectedTermFilter === "overall"
                        ? "Sorted by Latest CGPA"
                        : `Sorted by Term ${selectedTermFilter} GPA`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="border-b border-slate-800/90 bg-[#0E172A] text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Rank</th>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Student ID</th>
                          <th className="px-4 py-3">Term</th>
                          <th className="px-4 py-3">Term GPA</th>
                          <th className="px-4 py-3">CGPA</th>
                          <th className="px-4 py-3">Retakes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {rankedLeaderboard.map((row, idx) => {
                          const isMe = row.student_id === user.id || row.roll_code.toLowerCase() === myRollClean;
                          const isYearDropped = row.category === "air_dropped";
                          const retakeSubjects = row.remarks ? row.remarks.replace(/^Retakes:\s*/i, "").trim() : "";

                          return (
                            <tr
                              key={row.roll_code + idx}
                              className={
                                isMe
                                  ? "bg-emerald-500/10 font-semibold"
                                  : isYearDropped
                                    ? "bg-rose-500/5 hover:bg-rose-500/10"
                                    : "transition-colors hover:bg-[#0E172A]/80"
                              }
                            >
                              <td className="px-4 py-3 font-bold text-white">
                                {row.isNumericRank ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    {row.numericRank === 1 && <Trophy className="h-4 w-4 text-amber-400" />}
                                    {row.numericRank === 2 && <Medal className="h-4 w-4 text-slate-300" />}
                                    {row.numericRank === 3 && <Award className="h-4 w-4 text-amber-600" />}
                                    <span className={isMe ? "text-emerald-300" : ""}>{row.rankDisplay}</span>
                                  </span>
                                ) : row.category === "irregular" ? (
                                  <span className="inline-flex items-center rounded-md border border-purple-500/35 bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold text-purple-300">
                                    Irregular
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-md border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-300">
                                    Unranked
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <StudentAvatar name={row.displayName} avatarUrl={row.avatarUrl} size="sm" />
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {row.displayName ? (
                                      <span className="font-medium text-slate-100">{row.displayName}</span>
                                    ) : (
                                      <span className="text-xs italic text-slate-500">Not registered yet</span>
                                    )}
                                    {isMe && (
                                      <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                        You
                                      </span>
                                    )}
                                    {row.badgeLabel && (
                                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${row.badgeColor}`}>
                                        {row.badgeLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-300">
                                {row.roll_code}
                              </td>

                              <td className="px-4 py-3 text-slate-300">
                                Term {row.level_term_key}
                              </td>

                              <td className="px-4 py-3 font-semibold text-cyan-400">
                                {Number(row.gpa).toFixed(2)}
                              </td>

                              <td className="px-4 py-3 font-bold text-emerald-400">
                                {row.level_term_key === "1-1"
                                  ? "1-1 Only"
                                  : Number(row.cgpa ?? row.gpa).toFixed(2)}
                              </td>

                              <td className="px-4 py-3">
                                {isYearDropped ? (
                                  <span className="rounded-md border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                                    Year Dropped
                                  </span>
                                ) : row.term_retake_count > 0 ? (
                                  <span className="rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                    {retakeSubjects || `${row.term_retake_count} Retake`}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-emerald-400">Clear</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}