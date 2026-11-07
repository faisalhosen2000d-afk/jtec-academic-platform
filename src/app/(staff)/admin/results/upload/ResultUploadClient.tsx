"use client";

import { useState } from "react";
import { UploadCloud, AlertTriangle, CheckCircle, FileText, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  verifyMissingStudentsForBatch,
  commitBatchResultsAndAirDrops,
  StudentResultEntry,
  MissingStudentDecision,
} from "@/server/actions/academic-results";

interface BatchItem {
  id: string;
  name: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

interface LevelItem {
  id: string;
  name: string;
  level_number?: number;
}

interface TermItem {
  id: string;
  name: string;
  term_number?: number;
}

interface ResultUploadClientProps {
  departments: DepartmentItem[];
  batches: BatchItem[];
  levels: LevelItem[];
  terms: TermItem[];
}

interface MissingStudentInfo {
  id: string;
  full_name: string;
  student_id: string;
  email: string;
}

export default function ResultUploadClient({ departments, batches, levels, terms }: ResultUploadClientProps) {
  const [selectedDept, setSelectedDept] = useState(departments[0]?.id || "");
  const [selectedBatch, setSelectedBatch] = useState(batches[0]?.id || "");
  const [selectedLevel, setSelectedLevel] = useState(levels[0]?.id || "");
  const [selectedTerm, setSelectedTerm] = useState(terms[0]?.id || "");

  const [rawCsvText, setRawCsvText] = useState("");
  const [parsedResults, setParsedResults] = useState<StudentResultEntry[]>([]);
  const [missingStudents, setMissingStudents] = useState<MissingStudentInfo[]>([]);
  const [missingDecisions, setMissingDecisions] = useState<Record<string, MissingStudentDecision>>({});

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentLevelObj = levels.find((l) => l.id === selectedLevel);
  const currentTermObj = terms.find((t) => t.id === selectedTerm);
  const lvlNum = currentLevelObj?.name.match(/\d+/)?.[0] || "1";
  const trmNum = currentTermObj?.name.match(/\d+/)?.[0] || "1";
  const levelTermKey = `${lvlNum}-${trmNum}`;
  const isFirstTerm = levelTermKey === "1-1";

  // Parse CSV format: StudentID, GPA, CGPA, Credits, Retakes
  const handleParseCsv = () => {
    setStatusMsg(null);
    if (!rawCsvText.trim()) {
      setStatusMsg({ type: "error", text: "Please paste CSV result rows or student entries." });
      return;
    }

    const lines = rawCsvText.trim().split("\n");
    const results: StudentResultEntry[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.toLowerCase().startsWith("student") || line.toLowerCase().startsWith("roll")) continue;

      const cols = line.split(/[\t,;|]+/).map((c) => c.trim());
      if (cols.length < 2) continue;

      const studentId = cols[0] ?? "";
      const gpa = parseFloat(cols[1] ?? "");
      if (!studentId || isNaN(gpa)) continue;

      const cgpa = cols[2] ? parseFloat(cols[2]) : (isFirstTerm ? null : gpa);
      const earnedCredits = cols[3] ? parseFloat(cols[3]) : 0;
      const retakeCount = cols[4] ? parseInt(cols[4], 10) : (gpa < 2.0 ? 1 : 0);

      results.push({
        student_id_string: studentId,
        gpa,
        cgpa: isNaN(cgpa as number) ? null : cgpa,
        earned_credits: isNaN(earnedCredits) ? 0 : earnedCredits,
        term_retake_count: isNaN(retakeCount) ? 0 : retakeCount,
      });
    }

    if (results.length === 0) {
      setStatusMsg({ type: "error", text: "Could not parse valid student entries. Please check the format." });
      return;
    }

    setParsedResults(results);
    setStatusMsg({ type: "success", text: `Successfully parsed ${results.length} student results! Now check missing students.` });
  };

  // Step 1: Detect missing students against registered batch roster
  const handleDetectMissing = async () => {
    if (parsedResults.length === 0) {
      setStatusMsg({ type: "error", text: "Please parse the result list first." });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const presentIds = parsedResults.map((r) => r.student_id_string);
    const res = await verifyMissingStudentsForBatch({
      department_id: selectedDept,
      batch_id: selectedBatch,
      present_student_ids: presentIds,
    });

    setLoading(false);

    if (res.error) {
      setStatusMsg({ type: "error", text: res.error });
      return;
    }

    const missing = (res.missingStudents || []) as MissingStudentInfo[];
    setMissingStudents(missing);

    if (missing.length > 0) {
      // Initialize default decisions
      const initialDecisions: Record<string, MissingStudentDecision> = {};
      missing.forEach((s) => {
        initialDecisions[s.id] = {
          profile_id: s.id,
          student_id_string: s.student_id,
          action: "air_drop",
          drop_reason: "academic_failure",
        };
      });
      setMissingDecisions(initialDecisions);
      setShowModal(true);
    } else {
      // No missing students, directly proceed
      await handleCommitAll([]);
    }
  };

  // Step 2: Final commit for results and confirmed air drops
  const handleCommitAll = async (decisions: MissingStudentDecision[]) => {
    setLoading(true);
    setStatusMsg(null);

    const res = await commitBatchResultsAndAirDrops({
      department_id: selectedDept,
      batch_id: selectedBatch,
      level_id: selectedLevel,
      term_id: selectedTerm,
      level_term_key: levelTermKey,
      results: parsedResults,
      missing_decisions: decisions,
    });

    setLoading(false);
    setShowModal(false);

    if (res.error) {
      setStatusMsg({ type: "error", text: res.error });
    } else {
      setStatusMsg({
        type: "success",
        text: `Term ${levelTermKey} results successfully published for ${res.count} students!`,
      });
      setRawCsvText("");
      setParsedResults([]);
      setMissingStudents([]);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Target Level & Batch Selector */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Select Target Term & Batch
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Academic Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium"
            >
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Academic Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold mt-2">
          <span>Active Target: Level {lvlNum} Term {trmNum} (Key: {levelTermKey})</span>
          {isFirstTerm && <span className="bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded-full text-[10px]">1-1 Initial GPA Only</span>}
        </div>
      </div>

      {/* CSV / Sheet Data Input */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Paste or Input Result Sheet Data
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Format: <span className="font-mono text-foreground font-semibold">StudentID, GPA, CGPA, EarnedCredits, RetakeCount</span> (or copy directly from Excel)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRawCsvText("24060401001, 3.85, 3.85, 20.5, 0\n24060401002, 3.42, 3.42, 17.5, 1\n24060401021, 3.92, 3.92, 20.5, 0");
            }}
            className="text-xs h-8 px-3"
          >
            Insert Sample Row
          </Button>
        </div>

        <textarea
          rows={6}
          value={rawCsvText}
          onChange={(e) => setRawCsvText(e.target.value)}
          placeholder="e.g.&#10;24060401001, 3.85, 3.85, 20.5, 0&#10;24060401002, 3.42, 3.42, 17.5, 1&#10;24060401021, 3.92, 3.92, 20.5, 0"
          className="w-full p-4 rounded-xl border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button onClick={handleParseCsv} variant="outline" className="text-xs h-9 px-4">
            Parse Sheet Rows ({parsedResults.length} Ready)
          </Button>

          <Button
            onClick={handleDetectMissing}
            disabled={parsedResults.length === 0 || loading}
            className="h-9 px-5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs"
          >
            {loading ? "Checking Roster..." : `Verify & Publish Results (${parsedResults.length})`}
          </Button>
        </div>
      </div>

      {/* Parsed Preview Table */}
      {parsedResults.length > 0 && (
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold flex items-center justify-between">
            <span>Parsed Entries Preview ({parsedResults.length} Students)</span>
            <span className="text-xs font-normal text-muted-foreground">Ready to commit to database</span>
          </h3>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Student ID</th>
                  <th className="px-3 py-2.5">Term GPA</th>
                  <th className="px-3 py-2.5">CGPA</th>
                  <th className="px-3 py-2.5">Earned Credits</th>
                  <th className="px-3 py-2.5">Retakes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedResults.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-muted/40">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-bold">{r.student_id_string}</td>
                    <td className="px-3 py-2 font-semibold text-blue-600">{r.gpa.toFixed(2)}</td>
                    <td className="px-3 py-2">{r.cgpa !== null && r.cgpa !== undefined ? r.cgpa.toFixed(2) : "N/A (1-1)"}</td>
                    <td className="px-3 py-2">{r.earned_credits}</td>
                    <td className="px-3 py-2">
                      {r.term_retake_count && r.term_retake_count > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                          {r.term_retake_count} Retake
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedResults.length > 10 && (
            <p className="text-center text-xs text-muted-foreground">
              Showing first 10 of {parsedResults.length} parsed records
            </p>
          )}
        </div>
      )}

      {/* Missing Roll Detection & Air Drop Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-6 h-6 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Missing Students Detected ({missingStudents.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    These registered students were omitted from the uploaded official result sheet.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Official JTEC result sheets omit students who received an Air Drop. Please review each missing student below and select whether they should be migrated to the junior batch or excluded (e.g. in case of typos):
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2.5 rounded-xl border p-3 bg-muted/20">
              {missingStudents.map((s) => {
                const decision = missingDecisions[s.id];
                return (
                  <div key={s.id} className="p-3 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-foreground">{s.full_name}</div>
                      <div className="font-mono text-muted-foreground">ID: {s.student_id} • {s.email}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={decision?.action || "air_drop"}
                        onChange={(e) => {
                          const act = e.target.value as "air_drop" | "skip";
                          setMissingDecisions((prev) => ({
                            ...prev,
                            [s.id]: {
                              profile_id: s.id, student_id_string: s.student_id,
                              action: act,
                            },
                          }));
                        }}
                        className="h-8 px-2 rounded-lg border bg-background font-semibold"
                      >
                        <option value="air_drop">Year Drop (Migrate Batch)</option>
                        <option value="skip">Skip / Typo (Keep Current)</option>
                      </select>

                      {decision?.action === "air_drop" && (
                        <select
                          value={decision?.drop_reason || "academic_failure"}
                          onChange={(e) => {
                            const r = e.target.value as MissingStudentDecision["drop_reason"];
                            setMissingDecisions((prev) => ({
                              ...prev,
                              [s.id]: {
                                profile_id: s.id,
                                student_id_string: s.student_id,
                                action: prev[s.id]?.action || "air_drop",
                                drop_reason: r,
                              },
                            }));
                          }}
                          className="h-8 px-2 rounded-lg border bg-background"
                        >
                          <option value="academic_failure">&ge; 5 Retakes</option>
                          <option value="missed_practical_lab">Missed Final Lab</option>
                          <option value="disciplinary">Disciplinary Action</option>
                          <option value="manual_admin">Manual Admin Order</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                onClick={() => handleCommitAll(Object.values(missingDecisions))}
                disabled={loading}
                className="h-9 px-5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
              >
                {loading ? "Processing Migration..." : "Confirm Air Drops & Publish Results"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}