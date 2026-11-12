"use client";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle, FileText, ShieldAlert, X, Download, ChevronDown, Check } from "lucide-react";
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
}

interface TermItem {
  id: string;
  name: string;
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

function ModernDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all cursor-pointer ${
          open
            ? "border-emerald-400/80 bg-slate-900 text-white ring-2 ring-emerald-500/20"
            : "border-slate-700/80 bg-slate-950/90 text-slate-200 hover:border-slate-600 hover:bg-slate-900"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-emerald-400" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1224]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/15 font-semibold text-emerald-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ResultUploadClient({ departments, batches, levels, terms }: ResultUploadClientProps) {
  const [selectedDept, setSelectedDept] = useState(departments[0]?.id || "");
  const [selectedBatch, setSelectedBatch] = useState(batches[0]?.id || "");
  const [selectedLevel, setSelectedLevel] = useState(levels[0]?.id || "");
  const [selectedTerm, setSelectedTerm] = useState(terms[0]?.id || "");

  const [rawText, setRawText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedResults, setParsedResults] = useState<StudentResultEntry[]>([]);
  const [missingStudents, setMissingStudents] = useState<MissingStudentInfo[]>([]);
  const [missingDecisions, setMissingDecisions] = useState<Record<string, MissingStudentDecision>>({});

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentLevelObj = levels.find((l) => l.id === selectedLevel);
  const currentTermObj = terms.find((t) => t.id === selectedTerm);
  const lvlNum = currentLevelObj?.name.match(/\d+/)?.[0] || "1";
  const trmNum = currentTermObj?.name.match(/\d+/)?.[0] || "1";
  const levelTermKey = `${lvlNum}-${trmNum}`;
  const isFirstTerm = levelTermKey === "1-1";

  // Parse tab-separated or comma-separated rows
  // Parse official JTEC result rows: Sl. No | Exam. Roll | Name | GPA | [CGPA] | Result | Fail Subject(s)
  const parseRowsContent = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    const results: StudentResultEntry[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      // Skip table header lines
      if (
        lower.includes("department:") ||
        lower.includes("exam. roll") ||
        lower.includes("name of examinee") ||
        (lower.includes("sl.") && lower.includes("gpa"))
      ) {
        continue;
      }

      // 1. Extract 10-12 digit Student ID / Exam Roll
      const rollMatch = line.match(/\b(2\d{9,11})\b/);
      const studentId = rollMatch?.[1] ?? "";
      if (!studentId) continue;

      // 2. Extract GPA and optional CGPA (decimal numbers between 1.00 and 4.00)
      const afterRoll = line.substring(line.indexOf(studentId) + studentId.length);
      const gpaMatches = Array.from(afterRoll.matchAll(/\b([1-4]\.\d{1,2}|0\.00)\b/g)).map((m) => parseFloat(m[1] ?? "0"));

      const gpa = gpaMatches[0];
      if (gpa === undefined || isNaN(gpa)) continue;
      const secondGpa = gpaMatches[1];
      const cgpa = !isFirstTerm && secondGpa !== undefined ? secondGpa : (isFirstTerm ? null : gpa);

      // 3. Extract Fail Subject(s) from the remainder of the line
      let retakeCount = 0;
      let retakeSubjectsStr: string | null = null;

      // Check after the last GPA or after "Promoted"
      let tail = afterRoll;
      if (tail.includes("Promoted")) {
        tail = tail.substring(tail.indexOf("Promoted") + 8);
      } else {
        const lastGpaStr = String(gpaMatches[gpaMatches.length - 1]);
        const gpaIdx = tail.lastIndexOf(lastGpaStr);
        if (gpaIdx !== -1) tail = tail.substring(gpaIdx + lastGpaStr.length);
      }

      const cleanTail = tail.trim().replace(/^[|,\t\s]+|[|,\t\s]+$/g, "");

      // If it is "--" or empty or "none" or "0", no retakes
      if (cleanTail && cleanTail !== "--" && cleanTail !== "-" && cleanTail !== "0" && cleanTail.toLowerCase() !== "none") {
        const codes = cleanTail
          .split(/[,;|]+/)
          .map((s) => s.trim().replace(/^["']|["']$/g, "").toUpperCase())
          .filter((s) => s && s !== "--" && s !== "-");

        if (codes.length > 0) {
          retakeCount = codes.length;
          retakeSubjectsStr = codes.join(", ");
        }
      }

      results.push({
        student_id_string: studentId,
        gpa,
        cgpa,
        earned_credits: 20.0,
        term_retake_count: retakeCount,
        retake_subjects: retakeSubjectsStr,
      });
    }

    return results;
  };

  const handleTextParse = () => {
    setStatusMsg(null);
    if (!rawText.trim()) {
      setStatusMsg({ type: "error", text: "Please paste your result data or upload an Excel/CSV file." });
      return;
    }

    const results = parseRowsContent(rawText);
    if (results.length === 0) {
      setStatusMsg({ type: "error", text: "Could not parse student rows. Please ensure Student ID and GPA are present." });
      return;
    }

    setParsedResults(results);
    setStatusMsg({ type: "success", text: `Successfully parsed ${results.length} student results!` });
  };

  // Handle direct file upload (CSV / TXT / Excel export)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || "");
      setRawText(content);
      const results = parseRowsContent(content);
      if (results.length > 0) {
        setParsedResults(results);
        setStatusMsg({ type: "success", text: `Loaded ${file.name} and parsed ${results.length} student results!` });
      } else {
        setStatusMsg({ type: "error", text: "File loaded but no valid student rows found. Please check column format." });
      }
    };
    reader.readAsText(file);
  };

  // Download Sample CSV template
  const handleDownloadTemplate = () => {
    const header = isFirstTerm ? "StudentID,TermGPA,Retakes" : "StudentID,TermGPA,CGPA,Retakes";
    const sample1 = isFirstTerm ? "24060401001,3.75,0" : "24060401001,3.75,3.68,0";
    const sample2 = isFirstTerm ? "24060401002,3.20,1" : "24060401002,3.20,3.35,1";
    const csvContent = "data:text/csv;charset=utf-8," + [header, sample1, sample2].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `JTEC_Result_Template_${levelTermKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Step 1: Detect missing students against batch roster
  const handleDetectMissing = async () => {
    if (parsedResults.length === 0) {
      setStatusMsg({ type: "error", text: "Please parse the result sheet first." });
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
      await handleCommitAll([]);
    }
  };

  // Step 2: Final commit for results and air-drop decisions
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
        text: `Results for Term ${levelTermKey} successfully published for ${res.count} students!`,
      });
      setRawText("");
      setUploadedFileName(null);
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Target Level & Batch Selector */}
      <div className="lg:col-span-5 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl space-y-5">
        <h2 className="text-base font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          1. Select Target Department, Batch & Term
        </h2>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Department</label>
            <ModernDropdown value={selectedDept} onChange={setSelectedDept} placeholder="Select Department" options={departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Batch</label>
            <ModernDropdown value={selectedBatch} onChange={setSelectedBatch} placeholder="Select Batch" options={batches.map((b) => ({ value: b.id, label: b.name }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Academic Level</label>
            <ModernDropdown value={selectedLevel} onChange={setSelectedLevel} placeholder="Select Level" options={levels.map((l) => ({ value: l.id, label: l.name }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Academic Term</label>
            <ModernDropdown value={selectedTerm} onChange={setSelectedTerm} placeholder="Select Term" options={Array.from(new Map(terms.map((t) => [t.name.trim(), { value: t.id, label: t.name }])).values())} />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
          <span>Targeting: Level {lvlNum} Term {trmNum} (Key: {levelTermKey})</span>
          {isFirstTerm ? (
            <span className="bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded-full text-[10px]">
              Level 1 Term 1 (Requires Term GPA Only)
            </span>
          ) : (
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px]">
              Term GPA + Cumulative CGPA
            </span>
          )}
        </div>
      </div>

      {/* Excel / CSV Upload Zone & Paste Area */}
      <div className="lg:col-span-7 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              2. Upload Result Sheet or Paste Data
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Accepted columns: <span className="font-mono font-semibold text-white">StudentID, Term GPA{isFirstTerm ? "" : ", CGPA"}, Retakes</span>
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="text-xs h-9 px-3 gap-1.5 self-start sm:self-auto border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Download Excel Template (.csv)
          </Button>
        </div>

        {/* Drag & Drop File Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-950/70 hover:bg-slate-900/80"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt,.tsv"
            className="hidden"
          />
          <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
          <div className="text-sm font-bold text-slate-200">
            {uploadedFileName ? `Selected: ${uploadedFileName}` : "Click to select or drop your Excel/CSV result file here"}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supports CSV, TSV, or comma-separated exports directly from MS Excel or Google Sheets
          </p>
        </div>

        {/* Text Area for Direct Copy-Paste from Excel */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase flex items-center justify-between">
            <span>Or Copy & Paste directly from Excel</span>
            <span className="text-[11px] font-normal lowercase">Tabs, commas or lines are auto-detected</span>
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              isFirstTerm
                ? "StudentID\tGPA\tRetakes\n24060401001\t3.85\t0\n24060401002\t3.42\t1\n24060401021\t3.92\t0"
                : "StudentID\tGPA\tCGPA\tRetakes\n24060401001\t3.85\t3.80\t0\n24060401002\t3.42\t3.45\t1\n24060401021\t3.92\t3.90\t0"
            }
            className="w-full p-4 rounded-xl border bg-slate-950 border-slate-700/80 text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button onClick={handleTextParse} variant="outline" className="text-xs h-10 px-4 border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white cursor-pointer">
            Parse Sheet ({parsedResults.length} Ready)
          </Button>

          <Button
            onClick={handleDetectMissing}
            disabled={parsedResults.length === 0 || loading}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg cursor-pointer"
          >
            {loading ? "Checking Roster..." : `Verify & Publish Results (${parsedResults.length})`}
          </Button>
        </div>
      </div>

      </div>
      {/* Parsed Preview Table */}
      {parsedResults.length > 0 && (
        <div className="lg:col-span-5 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl space-y-5">
          <h3 className="text-sm font-bold flex items-center justify-between">
            <span>Parsed Entries Preview ({parsedResults.length} Students)</span>
            <span className="text-xs font-normal text-slate-400">Ready to commit to database</span>
          </h3>

          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-800 shadow-inner">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Student ID</th>
                  <th className="px-3 py-2.5">Term GPA</th>
                  <th className="px-3 py-2.5">CGPA</th>
                  <th className="px-3 py-2.5">Retakes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parsedResults.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-900/60">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-bold">{r.student_id_string}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-400">{r.gpa.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {isFirstTerm ? "N/A (1-1)" : r.cgpa !== null && r.cgpa !== undefined ? r.cgpa.toFixed(2) : "Same as GPA"}
                    </td>
                    <td className="px-3 py-2">
                      {r.term_retake_count && r.term_retake_count > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[10px]">
                          {r.retake_subjects ? `${r.retake_subjects} (${r.term_retake_count})` : `${r.retake_subjects ? `${r.retake_subjects} (${r.term_retake_count})` : `${r.term_retake_count} Retake`}`}
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
          {false && (
            <p className="text-center text-xs text-slate-400">
              Showing first 10 of {parsedResults.length} parsed records
            </p>
          )}
        </div>
      )}

      {/* Missing Roll Detection & Air Drop Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-6 h-6 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Missing Students Detected ({missingStudents.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    These registered students were omitted from this term result sheet.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Official JTEC result sheets omit students who received an Air Drop. Please review each missing student below and select whether they should be migrated to the junior batch or excluded:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2.5 rounded-xl border p-3 bg-muted/20">
              {missingStudents.map((s) => {
                const decision = missingDecisions[s.id];
                return (
                  <div key={s.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{s.full_name}</div>
                      <div className="font-mono text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">Roll: {s.student_id} &bull; <span className="text-amber-600 dark:text-amber-400 font-bold">{s.email}</span></div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={decision?.action || "air_drop"}
                        onChange={(e) => {
                          const act = e.target.value as "air_drop" | "skip";
                          setMissingDecisions((prev) => ({
                            ...prev,
                            [s.id]: {
                              profile_id: s.id,
                              student_id_string: s.student_id,
                              action: act,
                              drop_reason: prev[s.id]?.drop_reason || "academic_failure",
                            },
                          }));
                        }}
                        className="h-9 px-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
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
                          className="h-9 px-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
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