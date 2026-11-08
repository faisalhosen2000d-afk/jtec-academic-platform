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
  const [targetGoalCgpa, setTargetGoalCgpa] = useState<string>("3.60");

  const currentCurriculum: DepartmentCurriculum = useMemo(() => {
    return (ALL_CURRICULA[selectedDeptId] || ALL_CURRICULA.ae)!;
  }, [selectedDeptId]);

  const publishedMap = useMemo(() => {
    const map = new Map<string, number>();
    publishedResults.forEach((r) => map.set(r.termKey, r.gpa));
    return map;
  }, [publishedResults]);

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
        t.termKey === selectedTermKey ? { ...t, gpa: Number(termCalculation.termGpa.toFixed(2)) } : t
      )
    );
    setActiveMode("cgpa");
  };

  const cgpaCalculation = useMemo(() => {
    let completedPoints = 0;
    let completedCredits = 0;
    let projectedPoints = 0;
    let projectedCredits = 0;
    let remainingCredits = 0;

    termPlanner.forEach((t) => {
      if (!t.isIncluded) return;
      const points = t.gpa * t.credits;

      if (t.isPublished) {
        completedPoints += points;
        completedCredits += t.credits;
      } else {
        remainingCredits += t.credits;
      }

      projectedPoints += points;
      projectedCredits += t.credits;
    });

    const currentCgpa = completedCredits > 0 ? completedPoints / completedCredits : 0;
    const projectedFinalCgpa = projectedCredits > 0 ? projectedPoints / projectedCredits : 0;

    const target = parseFloat(targetGoalCgpa) || 3.50;
    const requiredTotalPoints = target * projectedCredits;
    const neededRemainingPoints = requiredTotalPoints - completedPoints;
    const neededAverageGpa = remainingCredits > 0 ? neededRemainingPoints / remainingCredits : 0;

    return {
      completedCredits,
      totalCredits: currentCurriculum.totalCredits,
      completedPoints,
      currentCgpa,
      projectedFinalCgpa,
      remainingCredits,
      neededAverageGpa,
      isGoalFeasible: neededAverageGpa <= 4.00,
    };
  }, [termPlanner, currentCurriculum, targetGoalCgpa]);

  const resetAllCourses = () => {
    setCourseGradeMap({});
  };

  const reloadPublishedResults = () => {
    setTermPlanner((prev) =>
      prev.map((t) => {
        const hasPublished = publishedMap.has(t.termKey);
        const pubGpa = publishedMap.get(t.termKey) || 0;
        return {
          ...t,
          gpa: hasPublished ? pubGpa : 3.50,
          isPublished: hasPublished,
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 text-xs font-semibold">
            <Calculator className="w-3.5 h-3.5" />
            Official BUTEX / JTEC Curriculum Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CGPA Calculator & Target Planner</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {studentName} ({studentRoll}) &bull; Real-time credit weighted calculation & target projection
          </p>
        </div>

        <div className="flex items-center rounded-xl bg-muted p-1 border shadow-inner">
          <button
            onClick={() => setActiveMode("cgpa")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeMode === "cgpa" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
            CGPA & Future Targets
          </button>
          <button
            onClick={() => setActiveMode("term")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeMode === "term" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />
            Term GPA by Courses
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-card border rounded-2xl p-2.5 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">Department:</span>
        {Object.values(ALL_CURRICULA).map((dept) => {
          const isSelected = selectedDeptId === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDeptId(dept.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-muted/50 text-foreground hover:bg-muted"
              }`}
            >
              <span>{dept.name} ({dept.shortName})</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {dept.totalCredits} Cr
              </span>
            </button>
          );
        })}
      </div>

      {activeMode === "cgpa" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current CGPA</span>
              <div className="text-3xl font-extrabold text-blue-600">
                {cgpaCalculation.currentCgpa > 0 ? cgpaCalculation.currentCgpa.toFixed(2) : "N/A"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Based on published results ({cgpaCalculation.completedCredits} credits completed)
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projected Graduation CGPA</span>
              <div className="text-3xl font-extrabold text-emerald-600">
                {cgpaCalculation.projectedFinalCgpa > 0 ? cgpaCalculation.projectedFinalCgpa.toFixed(2) : "N/A"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Overall completed + target future terms
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Degree Progress</span>
              <div className="text-2xl font-bold mt-1">
                {cgpaCalculation.completedCredits} / {cgpaCalculation.totalCredits} Cr
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(cgpaCalculation.completedCredits / cgpaCalculation.totalCredits) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Target Goal Finder</span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Desired CGPA:</span>
                <input
                  type="number"
                  step="0.01"
                  min="2.00"
                  max="4.00"
                  value={targetGoalCgpa}
                  onChange={(e) => setTargetGoalCgpa(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg border bg-background text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                {cgpaCalculation.remainingCredits > 0 ? (
                  cgpaCalculation.isGoalFeasible ? (
                    <span>
                      Target <b>{targetGoalCgpa}</b> পৌঁছাতে বাকি {cgpaCalculation.remainingCredits} ক্রেডিটে গড়ে <b>{cgpaCalculation.neededAverageGpa.toFixed(2)}</b> GPA প্রয়োজন!
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      এই টার্গেট পৌঁছাতে গড়ে {cgpaCalculation.neededAverageGpa.toFixed(2)} GPA লাগবে (যা ৪.০০ এর চেয়ে বেশি)।
                    </span>
                  )
                ) : (
                  <span>সবগুলো টার্ম ইতিমধ্যে সম্পন্ন হয়েছে!</span>
                )}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">Term-by-Term Cumulative Planner</h3>
                <p className="text-xs text-muted-foreground">Adjust future term GPAs to see your projected graduation CGPA.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reloadPublishedResults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium bg-background hover:bg-muted transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Load My Published Results
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Term GPA</th>
                    <th className="px-4 py-3">Quality Points</th>
                    <th className="px-4 py-3 text-right">Course Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {termPlanner.map((t, idx) => {
                    const isPublished = t.isPublished;
                    const qualityPoints = (t.gpa * t.credits).toFixed(2);
                    return (
                      <tr key={t.termKey} className="hover:bg-muted/40 transition">
                        <td className="px-4 py-3 font-bold">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            Level {t.termKey.split("-")[0]} Term {t.termKey.split("-")[1]} ({t.termKey})
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{t.credits} Cr</td>
                        <td className="px-4 py-3">
                          {isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Published Result
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                              Target / Projected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0.00"
                              max="4.00"
                              value={t.gpa}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setTermPlanner((prev) =>
                                  prev.map((item) =>
                                    item.termKey === t.termKey ? { ...item, gpa: Math.min(4.0, Math.max(0, val)) } : item
                                  )
                                );
                              }}
                              className={`w-20 px-2.5 py-1 rounded-lg border font-bold text-center text-sm ${
                                isPublished ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-extrabold border-emerald-300" : "bg-background"
                              }`}
                            />
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {gradePointToLetter(t.gpa)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-muted-foreground">
                          {qualityPoints}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedTermKey(t.termKey);
                              setActiveMode("term");
                            }}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            Calculate by Courses <ArrowRight className="w-3.5 h-3.5" />
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
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Select Term:</span>
              {currentCurriculum.terms.map((t) => (
                <button
                  key={t.termKey}
                  onClick={() => setSelectedTermKey(t.termKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedTermKey === t.termKey
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-muted/50 text-foreground hover:bg-muted"
                  }`}
                >
                  L{t.termKey.split("-")[0]} T{t.termKey.split("-")[1]} ({t.totalCredits} Cr)
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border">
              <button
                onClick={() => setInputFormat("point")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  inputFormat === "point" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Grade Point (0-4)
              </button>
              <button
                onClick={() => setInputFormat("letter")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  inputFormat === "letter" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Letter (A+, A...)
              </button>
              <button
                onClick={() => setInputFormat("marks")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  inputFormat === "marks" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Marks %
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {currentTermCurriculum.title} — Course Breakdown ({currentTermCurriculum.totalCredits} Credits)
                </h3>
                <p className="text-xs text-muted-foreground">Input each course score using {inputFormat.toUpperCase()} format.</p>
              </div>
              <button
                onClick={resetAllCourses}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear Courses
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold">
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
                <tbody className="divide-y divide-border">
                  {currentTermCurriculum.courses.map((course) => {
                    const currentPoint = courseGradeMap[course.code];
                    const hasEntry = currentPoint !== undefined;
                    const letter = hasEntry ? gradePointToLetter(currentPoint) : "-";
                    const earnedPoints = hasEntry ? (currentPoint * course.credits).toFixed(2) : "-";

                    return (
                      <tr key={course.code} className="hover:bg-muted/40 transition">
                        <td className="px-4 py-3 font-mono font-bold text-xs">{course.code}</td>
                        <td className="px-4 py-3 font-medium">{course.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            course.type === "theory" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          }`}>
                            {course.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold">{course.credits.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          {inputFormat === "point" && (
                            <input
                              type="number"
                              step="0.01"
                              min="0.00"
                              max="4.00"
                              placeholder="0.00 - 4.00"
                              value={currentPoint !== undefined ? currentPoint : ""}
                              onChange={(e) => handleCourseGradeChange(course.code, parseFloat(e.target.value) || 0)}
                              className="w-28 px-2.5 py-1 rounded-lg border bg-background text-sm font-semibold"
                            />
                          )}

                          {inputFormat === "letter" && (
                            <select
                              value={hasEntry ? letter : ""}
                              onChange={(e) => handleCourseGradeChange(course.code, letterToGradePoint(e.target.value))}
                              className="w-28 px-2 py-1 rounded-lg border bg-background text-sm font-semibold"
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
                              onChange={(e) => {
                                const m = parseFloat(e.target.value) || 0;
                                handleCourseGradeChange(course.code, marksToGradePoint(m));
                              }}
                              className="w-28 px-2.5 py-1 rounded-lg border bg-background text-sm font-semibold"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasEntry ? (
                            <span className="font-bold text-blue-600">
                              {currentPoint.toFixed(2)} ({letter})
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 text-xs">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-emerald-600">
                          {earnedPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 sm:p-6 bg-muted/30 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground">Calculated Term GPA</span>
                <div className="text-3xl font-extrabold text-blue-600 mt-0.5">
                  {termCalculation.termGpa.toFixed(2)}
                  <span className="text-sm font-semibold text-muted-foreground ml-2">
                    ({gradePointToLetter(termCalculation.termGpa)})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Graded {termCalculation.gradedCredits} of {termCalculation.totalTermCredits} credits &bull; {termCalculation.totalQualityPoints.toFixed(2)} Quality Points
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={applyTermGpaToPlanner}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-sm hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Save & Apply to CGPA Planner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}