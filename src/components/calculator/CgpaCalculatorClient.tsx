"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Calculator, 
  TrendingUp, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  BookOpen,
  ArrowRight
} from "lucide-react";
import { 
  ALL_CURRICULA, 
  BUTEX_GRADING_SCALE, 
  marksToGradePoint, 
  gradePointToLetter, 
  letterToGradePoint,
  DepartmentCurriculum,
  TermCurriculum 
} from "@/lib/curriculum-data";

interface PublishedResultItem {
  termKey: string;
  gpa: number;
  cgpa: number | null;
}

interface CgpaCalculatorClientProps {
  studentName: string;
  studentRoll: string;
  defaultDepartmentId: string;
  publishedResults: PublishedResultItem[];
}

interface TermPlannerState {
  termKey: string;
  gpa: number;
  credits: number;
  isIncluded: boolean;
  isPublished: boolean;
}

export function CgpaCalculatorClient({
  studentName,
  studentRoll,
  defaultDepartmentId = "ae",
  publishedResults = []
}: CgpaCalculatorClientProps) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>(defaultDepartmentId in ALL_CURRICULA ? defaultDepartmentId : "ae");
  const [activeMode, setActiveMode] = useState<"cgpa" | "term">("cgpa");
  const [selectedTermKey, setSelectedTermKey] = useState<string>("1-1");
  const [inputFormat, setInputFormat] = useState<"point" | "letter" | "marks">("point");
  const [courseGradeMap, setCourseGradeMap] = useState<Record<string, number>>({});
  const [courseMarksMap, setCourseMarksMap] = useState<Record<string, string>>({});
  const [targetGoalCgpa, setTargetGoalCgpa] = useState<string>("3.60");

  const isOwnDepartment = selectedDeptId === defaultDepartmentId;

  const currentCurriculum: DepartmentCurriculum = useMemo(() => {
    return (ALL_CURRICULA[selectedDeptId] || ALL_CURRICULA.ae)!;
  }, [selectedDeptId]);

  const publishedMap = useMemo(() => {
    const map = new Map<string, number>();
    if (isOwnDepartment) {
      publishedResults.forEach((r) => map.set(r.termKey, r.gpa));
    }
    return map;
  }, [publishedResults, isOwnDepartment]);

  const [termPlanner, setTermPlanner] = useState<TermPlannerState[]>([]);

  useEffect(() => {
    const initialTerms: TermPlannerState[] = currentCurriculum.terms.map((t) => {
      const hasPublished = publishedMap.has(t.termKey);
      const pubGpa = publishedMap.get(t.termKey) || 0;
      return {
        termKey: t.termKey,
        gpa: hasPublished ? pubGpa : 3.50,
        credits: t.totalCredits,
        isIncluded: true,
        isPublished: hasPublished,
      };
    });
    setTermPlanner(initialTerms);
  }, [currentCurriculum, publishedMap]);

  const currentTermCurriculum: TermCurriculum = useMemo(() => {
    return (currentCurriculum.terms.find((t) => t.termKey === selectedTermKey) || currentCurriculum.terms[0])!;
  }, [currentCurriculum, selectedTermKey]);

  const handleCourseGradeChange = (courseCode: string, point: number) => {
    setCourseGradeMap((prev) => ({
      ...prev,
      [courseCode]: Math.min(4.0, Math.max(0, point)),
    }));
  };

  const termCalculation = useMemo(() => {
    let totalQualityPoints = 0;
    let gradedCredits = 0;

    currentTermCurriculum.courses.forEach((c) => {
      const gp = courseGradeMap[c.code];
      if (gp !== undefined) {
        totalQualityPoints += gp * c.credits;
        gradedCredits += c.credits;
      }
    });

    const termGpa = gradedCredits > 0 ? totalQualityPoints / gradedCredits : 0;
    return {
      totalQualityPoints,
      gradedCredits,
      totalTermCredits: currentTermCurriculum.totalCredits,
      termGpa,
    };
  }, [currentTermCurriculum, courseGradeMap]);

  const applyTermGpaToPlanner = () => {
    setTermPlanner((prev) =>
      prev.map((t) =>
        t.termKey === selectedTermKey ? { ...t, gpa: Number(termCalculation.termGpa.toFixed(2)), isIncluded: true } : t
      )
    );
    setActiveMode("cgpa");
  };

  const cgpaCalculation = useMemo(() => {
    let completedPoints = 0;
    let completedCredits = 0;
    let futurePoints = 0;
    let remainingCredits = 0;

    const hasModifiedPublished = termPlanner.some(
      (t) => t.isPublished && Math.abs(t.gpa - (publishedMap.get(t.termKey) || 0)) > 0.001
    );

    termPlanner.forEach((t) => {
      if (!t.isIncluded) return;
      const points = t.gpa * t.credits;

      if (t.isPublished) {
        completedPoints += points;
        completedCredits += t.credits;
      } else {
        futurePoints += points;
        remainingCredits += t.credits;
      }
    });

    const latestPublishedWithCgpa = isOwnDepartment
      ? [...publishedResults].reverse().find((r) => r.cgpa !== null && r.cgpa > 0)
      : undefined;

    const useOfficialCgpa = Boolean(
      isOwnDepartment && !hasModifiedPublished && latestPublishedWithCgpa && latestPublishedWithCgpa.cgpa
    );

    const currentCgpa = useOfficialCgpa && latestPublishedWithCgpa?.cgpa
      ? latestPublishedWithCgpa.cgpa
      : (completedCredits > 0 ? completedPoints / completedCredits : 0);

    const effectiveCompletedPoints = useOfficialCgpa && latestPublishedWithCgpa?.cgpa
      ? latestPublishedWithCgpa.cgpa * completedCredits
      : completedPoints;

    const totalIncludedCredits = completedCredits + remainingCredits;
    const totalProjectedPoints = effectiveCompletedPoints + futurePoints;
    const projectedFinalCgpa = totalIncludedCredits > 0 ? totalProjectedPoints / totalIncludedCredits : 0;

    const target = parseFloat(targetGoalCgpa) || 3.50;
    const requiredTotalPoints = target * totalIncludedCredits;
    const neededRemainingPoints = requiredTotalPoints - effectiveCompletedPoints;
    const neededAverageGpa = remainingCredits > 0 ? neededRemainingPoints / remainingCredits : 0;

    return {
      completedCredits,
      totalCredits: currentCurriculum.totalCredits,
      totalIncludedCredits,
      completedPoints: effectiveCompletedPoints,
      currentCgpa,
      projectedFinalCgpa,
      remainingCredits,
      neededAverageGpa,
      isGoalFeasible: neededAverageGpa <= 4.00,
    };
  }, [termPlanner, currentCurriculum, targetGoalCgpa, publishedResults, isOwnDepartment, publishedMap]);

  const resetAllCourses = () => {
    setCourseGradeMap({});
    setCourseMarksMap({});
  };

  const reloadPublishedResults = () => {
    setTermPlanner((prev) =>
      prev.map((t) => {
        const hasPublished = publishedMap.has(t.termKey);
        const pubGpa = publishedMap.get(t.termKey) || 0;
        return {
          ...t,
          gpa: hasPublished ? pubGpa : 3.50,
          isIncluded: true,
          isPublished: hasPublished,
        };
      })
    );
  };

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <section className="dash-stagger-1 relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#131024] via-[#0A1120] to-[#070C17] p-5 sm:p-6 shadow-[0_0_36px_rgba(139,92,246,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
              <Calculator className="h-3.5 w-3.5" />
              Official BUTEX / JTEC Curriculum Engine
            </span>

            <h1 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              CGPA Calculator &amp; Target Planner
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {studentName} {studentRoll ? `(${studentRoll})` : ""} &bull; Credit-weighted simulation &amp; target projection
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-800 bg-[#0B1324] p-1">
            <button
              type="button"
              onClick={() => setActiveMode("cgpa")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeMode === "cgpa"
                  ? "border border-violet-400/40 bg-violet-500/20 text-violet-200 shadow-sm"
                  : "border border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              CGPA &amp; Future Targets
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("term")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeMode === "term"
                  ? "border border-violet-400/40 bg-violet-500/20 text-violet-200 shadow-sm"
                  : "border border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Term GPA by Courses
            </button>
          </div>
        </div>
      </section>

      {/* Department Selector */}
      <section className="dash-stagger-2 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-3 shadow-lg">
        <span className="px-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          Department:
        </span>
        {Object.values(ALL_CURRICULA).map((dept) => {
          const isSelected = selectedDeptId === dept.id;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => setSelectedDeptId(dept.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#0E172A] text-slate-300 hover:border-slate-700 hover:text-white"
              }`}
            >
              <span>{dept.name} ({dept.shortName})</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  isSelected
                    ? "bg-cyan-400/20 text-cyan-200"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {dept.totalCredits} Cr
              </span>
            </button>
          );
        })}
      </section>

      {activeMode === "cgpa" && (
        <div className="dash-stagger-3 space-y-5">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-cyan-500/25 bg-[#0A1020] p-5 shadow-lg space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Current CGPA
              </span>
              <div className="text-3xl font-extrabold text-cyan-400">
                {cgpaCalculation.currentCgpa > 0
                  ? cgpaCalculation.currentCgpa.toFixed(2)
                  : "N/A"}
              </div>
              <p className="text-[11px] text-slate-400">
                Published ({cgpaCalculation.completedCredits} credits)
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Projected Graduation CGPA
              </span>
              <div className="text-3xl font-extrabold text-emerald-400">
                {cgpaCalculation.projectedFinalCgpa > 0
                  ? cgpaCalculation.projectedFinalCgpa.toFixed(2)
                  : "N/A"}
              </div>
              <p className="text-[11px] text-slate-400">
                Across {cgpaCalculation.totalIncludedCredits} included credits
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 shadow-lg space-y-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Degree Progress
              </span>
              <div className="text-2xl font-bold text-white">
                {cgpaCalculation.completedCredits} / {cgpaCalculation.totalCredits} Cr
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-slate-800 bg-[#0E172A]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (cgpaCalculation.completedCredits /
                        Math.max(1, cgpaCalculation.totalCredits)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-500/12 via-[#0A1020] to-[#0A1020] p-5 shadow-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" /> Target Goal
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="2.00"
                  max="4.00"
                  value={targetGoalCgpa}
                  onChange={(e) => setTargetGoalCgpa(e.target.value)}
                  className="w-16 rounded-lg border border-slate-700 bg-[#0E172A] px-2 py-1 text-center font-mono text-xs font-bold text-white outline-none focus:border-violet-400"
                />
              </div>
              {cgpaCalculation.remainingCredits > 0 ? (
                <>
                  <div
                    className={`text-2xl font-extrabold ${
                      cgpaCalculation.isGoalFeasible
                        ? "text-violet-300"
                        : "text-rose-400"
                    }`}
                  >
                    Req. Avg: {Math.max(0, cgpaCalculation.neededAverageGpa).toFixed(2)}
                  </div>
                  <p className="text-[11px] leading-snug text-slate-300">
                    {cgpaCalculation.isGoalFeasible
                      ? `Need ${Math.max(0, cgpaCalculation.neededAverageGpa).toFixed(2)} avg GPA across ${cgpaCalculation.remainingCredits} remaining credits.`
                      : "Required GPA exceeds 4.00 max across remaining terms."}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">All selected terms completed.</p>
              )}
            </div>
          </div>

          {/* Term-by-Term Cumulative Planner Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-800/80 p-4 sm:flex-row sm:items-center sm:p-5">
              <div>
                <h3 className="font-serif text-base font-bold text-white">
                  Term-by-Term Cumulative Planner
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Adjust any term GPA (including published terms to simulate retake clearance) or toggle terms.
                </p>
              </div>
              <button
                type="button"
                onClick={reloadPublishedResults}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0E172A] px-3.5 py-1.5 text-xs font-semibold text-cyan-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Published Results
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800/80 bg-[#0E172A] text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  <tr className="whitespace-nowrap">
                    <th className="w-12 px-3 py-3 text-center">Include</th>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-3 py-3">Credits</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Term GPA</th>
                    <th className="px-3 py-3">Quality Points</th>
                    <th className="px-4 py-3 text-right">Course Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {termPlanner.map((t, idx) => {
                    const isPublished = t.isPublished;
                    const qualityPoints = (t.gpa * t.credits).toFixed(2);
                    return (
                      <tr
                        key={t.termKey}
                        className={`transition ${
                          !t.isIncluded
                            ? "bg-[#070B14] opacity-45"
                            : "hover:bg-[#0E172A]/70"
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={t.isIncluded}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setTermPlanner((prev) =>
                                prev.map((item) =>
                                  item.termKey === t.termKey
                                    ? { ...item, isIncluded: checked }
                                    : item
                                )
                              );
                            }}
                            className="h-4 w-4 cursor-pointer rounded accent-cyan-400"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-100">
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/15 text-xs font-bold text-cyan-300">
                              {idx + 1}
                            </span>
                            <span>
                              Level {t.termKey.split("-")[0]} Term {t.termKey.split("-")[1]} ({t.termKey})
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-300">
                          {t.credits} Cr
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {isPublished ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 shrink-0" /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                              Target / Projected
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0.00"
                              max="4.00"
                              disabled={!t.isIncluded}
                              value={t.gpa}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setTermPlanner((prev) =>
                                  prev.map((item) =>
                                    item.termKey === t.termKey
                                      ? { ...item, gpa: Math.min(4.0, Math.max(0, val)) }
                                      : item
                                  )
                                );
                              }}
                              className={`w-20 rounded-lg border px-2.5 py-1 text-center font-mono text-sm font-bold outline-none ${
                                isPublished
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                  : "border-slate-700 bg-[#0E172A] text-white focus:border-cyan-400"
                              }`}
                            />
                            <span className="text-[11px] font-semibold text-slate-400">
                              {gradePointToLetter(t.gpa)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-semibold text-slate-400">
                          {t.isIncluded ? qualityPoints : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTermKey(t.termKey);
                              setActiveMode("term");
                            }}
                            className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                          >
                            Calculate by Courses <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeMode === "term" && (
        <div className="dash-stagger-3 space-y-5">
          {/* Term Selector & Format */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Select Term:
              </span>
              {currentCurriculum.terms.map((t) => (
                <button
                  key={t.termKey}
                  type="button"
                  onClick={() => setSelectedTermKey(t.termKey)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedTermKey === t.termKey
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-800 bg-[#0E172A] text-slate-300 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  L{t.termKey.split("-")[0]} T{t.termKey.split("-")[1]} ({t.totalCredits} Cr)
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0E172A] p-1">
              <button
                type="button"
                onClick={() => setInputFormat("point")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  inputFormat === "point"
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Grade Point (0-4)
              </button>
              <button
                type="button"
                onClick={() => setInputFormat("letter")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  inputFormat === "letter"
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Letter (A+, A...)
              </button>
              <button
                type="button"
                onClick={() => setInputFormat("marks")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  inputFormat === "marks"
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Marks %
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 p-4 sm:p-5">
              <div>
                <h3 className="font-serif text-base font-bold text-white">
                  {currentTermCurriculum.title} &mdash; Course Breakdown ({currentTermCurriculum.totalCredits} Credits)
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Input each course score using {inputFormat.toUpperCase()} format.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAllCourses}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                <RotateCcw className="h-3 w-3" /> Clear Courses
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800/80 bg-[#0E172A] text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Course Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Credit</th>
                    <th className="px-4 py-3">Your Grade / Marks</th>
                    <th className="px-4 py-3">Grade Point</th>
                    <th className="px-4 py-3 text-right">Points Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {currentTermCurriculum.courses.map((course) => {
                    const currentPoint = courseGradeMap[course.code];
                    const hasEntry = currentPoint !== undefined;
                    const letter = hasEntry ? gradePointToLetter(currentPoint) : "-";
                    const earnedPoints = hasEntry ? (currentPoint * course.credits).toFixed(2) : "-";

                    return (
                      <tr key={course.code} className="transition hover:bg-[#0E172A]/70">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-cyan-300">
                          {course.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-100">
                          {course.name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                              course.type === "theory"
                                ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                                : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                            }`}
                          >
                            {course.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-200">
                          {course.credits.toFixed(1)}
                        </td>
                        <td className="px-4 py-3">
                          {inputFormat === "point" && (
                            <input
                              type="number"
                              step="0.01"
                              min="0.00"
                              max="4.00"
                              placeholder="0.00 - 4.00"
                              value={currentPoint !== undefined ? currentPoint : ""}
                              onChange={(e) =>
                                handleCourseGradeChange(course.code, parseFloat(e.target.value) || 0)
                              }
                              className="w-28 rounded-lg border border-slate-700 bg-[#0E172A] px-2.5 py-1 text-sm font-semibold text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                            />
                          )}

                          {inputFormat === "letter" && (
                            <select
                              value={hasEntry ? letter : ""}
                              onChange={(e) =>
                                handleCourseGradeChange(course.code, letterToGradePoint(e.target.value))
                              }
                              className="w-28 rounded-lg border border-slate-700 bg-[#0E172A] px-2 py-1 text-sm font-semibold text-white outline-none focus:border-cyan-400"
                            >
                              <option value="">Select</option>
                              {BUTEX_GRADING_SCALE.map((g) => (
                                <option key={g.letter} value={g.letter}>
                                  {g.letter} ({g.point.toFixed(2)})
                                </option>
                              ))}
                            </select>
                          )}

                          {inputFormat === "marks" && (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0 - 100%"
                              value={courseMarksMap[course.code] ?? ""}
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                setCourseMarksMap((prev) => ({ ...prev, [course.code]: rawVal }));
                                if (rawVal === "") {
                                  setCourseGradeMap((prev) => {
                                    const copy = { ...prev };
                                    delete copy[course.code];
                                    return copy;
                                  });
                                } else {
                                  const m = parseFloat(rawVal) || 0;
                                  handleCourseGradeChange(course.code, marksToGradePoint(m));
                                }
                              }}
                              className="w-28 rounded-lg border border-slate-700 bg-[#0E172A] px-2.5 py-1 text-sm font-semibold text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasEntry ? (
                            <span className="font-bold text-cyan-400">
                              {currentPoint.toFixed(2)} ({letter})
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          {earnedPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-slate-800/80 bg-[#0E172A]/80 p-4 sm:flex-row sm:items-center sm:p-6">
              <div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Calculated Term GPA
                </span>
                <div className="mt-0.5 text-3xl font-extrabold text-cyan-400">
                  {termCalculation.termGpa.toFixed(2)}
                  <span className="ml-2 text-sm font-semibold text-slate-300">
                    ({gradePointToLetter(termCalculation.termGpa)})
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Graded {termCalculation.gradedCredits} of {termCalculation.totalTermCredits} credits &bull;{" "}
                  {termCalculation.totalQualityPoints.toFixed(2)} Quality Points
                </p>
              </div>

              <button
                type="button"
                onClick={applyTermGpaToPlanner}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300"
              >
                <TrendingUp className="h-4 w-4" />
                Save &amp; Apply to CGPA Planner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}