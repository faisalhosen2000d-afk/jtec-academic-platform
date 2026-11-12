"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import * as XLSX from "xlsx";

type AcademicOption = {
  id: string;
  name: string;
};

type TermOption = {
  id: string;
  name: string;
  level_id: string;
};

type StudentRow = {
  roll: string;
  student_id: string;
  name: string;
};

type GeneratedRegistration = {
  code: string;
  student_id: string;
  name?: string;
  roll?: string;
};

type BulkRegistrationActionResult = {
  success: boolean;
  count: number;
  registrations: GeneratedRegistration[];
};

type BulkRegistrationFormProps = {
  action: (
    formData: FormData,
  ) =>
    | BulkRegistrationActionResult
    | Promise<BulkRegistrationActionResult>;
  departments?: AcademicOption[];
  batches?: AcademicOption[];
  levels?: AcademicOption[];
  terms?: TermOption[];
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function getCellValue(
  row: Record<string, unknown>,
  possibleHeaders: string[],
) {
  const normalizedPossibleHeaders = possibleHeaders.map(normalizeHeader);

  for (const [key, value] of Object.entries(row)) {
    if (normalizedPossibleHeaders.includes(normalizeHeader(key))) {
      return String(value ?? "").trim();
    }
  }

  return "";
}

function ModernDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const out = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={ref} className="relative">
      <span className="mb-1.5 block text-xs font-semibold text-slate-300">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all ${
          disabled
            ? "cursor-not-allowed border-slate-800 bg-[#060A12]/60 text-slate-500 opacity-60"
            : open
              ? "cursor-pointer border-emerald-400/80 bg-slate-900 text-white ring-2 ring-emerald-500/20"
              : "cursor-pointer border-slate-700/80 bg-[#060A12] text-slate-200 hover:border-emerald-400/50"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180 text-emerald-400" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1224]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                  active
                    ? "bg-emerald-500/15 font-semibold text-emerald-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BulkRegistrationForm({
  action,
  departments = [],
  batches = [],
  levels = [],
  terms = [],
}: BulkRegistrationFormProps) {
  const [departmentId, setDepartmentId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [termId, setTermId] = useState("");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [fileName, setFileName] = useState("");

  const [generatedRegistrations, setGeneratedRegistrations] = useState<
    GeneratedRegistration[]
  >([]);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredTerms = useMemo(() => {
    if (!levelId) return [];
    return terms.filter((term) => term.level_id === levelId);
  }, [levelId, terms]);

  const selectedDepartment = departments.find((d) => d.id === departmentId);
  const selectedBatch = batches.find((b) => b.id === batchId);
  const selectedLevel = levels.find((l) => l.id === levelId);
  const selectedTerm = filteredTerms.find((t) => t.id === termId);

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleLevelChange(value: string) {
    setLevelId(value);
    setTermId("");
    clearMessages();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    clearMessages();
    const file = event.target.files?.[0];

    if (!file) {
      setFileName("");
      setStudents([]);
      return;
    }

    setIsReadingFile(true);
    setFileName(file.name);
    setStudents([]);
    setGeneratedRegistrations([]);

    try {
      const allowedExtensions = [".xlsx", ".xls", ".csv"];
      const lowerFileName = file.name.toLowerCase();
      const isAllowed = allowedExtensions.some((ext) =>
        lowerFileName.endsWith(ext),
      );

      if (!isAllowed) {
        throw new Error("Please upload an Excel (.xlsx/.xls) or CSV file.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("The uploaded file does not contain a worksheet.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        throw new Error("The first worksheet could not be read.");
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        { defval: "", raw: false },
      );

      if (rows.length === 0) {
        throw new Error("The uploaded file is empty.");
      }

      const parsedStudents: StudentRow[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (!row) continue;

        const studentId = getCellValue(row, [
          "Student ID",
          "student_id",
          "StudentID",
          "student id",
        ]);
        const name = getCellValue(row, [
          "Name",
          "name",
          "Student Name",
          "student_name",
          "StudentName",
        ]);
        const roll = getCellValue(row, [
          "Roll",
          "roll",
          "Roll No",
          "roll_no",
          "RollNo",
        ]);

        if (!studentId && !name && !roll) continue;
        if (!studentId) {
          throw new Error(`Student ID is missing at Excel row ${index + 2}.`);
        }
        if (!name) {
          throw new Error(`Student Name is missing at Excel row ${index + 2}.`);
        }

        parsedStudents.push({ roll, student_id: studentId, name });
      }

      if (parsedStudents.length === 0) {
        throw new Error("No valid student rows were found.");
      }
      if (parsedStudents.length > 1000) {
        throw new Error("Maximum 1000 students can be uploaded at once.");
      }

      const duplicateStudentIds = parsedStudents
        .map((s) => s.student_id)
        .filter((id, idx, all) => all.indexOf(id) !== idx);

      if (duplicateStudentIds.length > 0) {
        const uniqueDuplicates = Array.from(new Set(duplicateStudentIds));
        throw new Error(
          `Duplicate Student ID found: ${uniqueDuplicates.join(", ")}`,
        );
      }

      setStudents(parsedStudents);
      setSuccessMessage(`${parsedStudents.length} students loaded successfully.`);
    } catch (error) {
      setStudents([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to read the uploaded file.",
      );
    } finally {
      setIsReadingFile(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (isReadingFile) {
      setErrorMessage("Please wait until the file finishes loading.");
      return;
    }
    if (!departmentId) {
      setErrorMessage("Please select a Department.");
      return;
    }
    if (!batchId) {
      setErrorMessage("Please select a Batch.");
      return;
    }
    if (!levelId) {
      setErrorMessage("Please select a Level.");
      return;
    }
    if (!termId) {
      setErrorMessage("Please select a Term.");
      return;
    }
    if (students.length === 0) {
      setErrorMessage("Please upload a student list first.");
      return;
    }

    const formData = new FormData();
    formData.set("department_id", departmentId);
    formData.set("batch_id", batchId);
    formData.set("level_id", levelId);
    formData.set("term_id", termId);
    formData.set("students", JSON.stringify(students));

    setIsGenerating(true);

    try {
      const result = await action(formData);
      if (!result.success) {
        throw new Error("Registration codes could not be generated.");
      }

      setGeneratedRegistrations(result.registrations ?? []);
      setSuccessMessage(
        `${result.count} registration ${
          result.count === 1 ? "code" : "codes"
        } generated successfully.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate registration codes.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownloadExcel() {
    if (generatedRegistrations.length === 0) return;

    const exportRows = generatedRegistrations.map((registration, index) => {
      const originalStudent = students.find(
        (student) => student.student_id === registration.student_id,
      );

      return {
        SL: index + 1,
        Roll: registration.roll ?? originalStudent?.roll ?? "",
        "Student ID": registration.student_id,
        "Student Name": registration.name ?? originalStudent?.name ?? "",
        "Registration Code": registration.code,
      };
    });

    const headingRows = [
      ["Jhenaidah Textile Engineering College"],
      [selectedDepartment?.name ?? "Department"],
      [selectedBatch?.name ?? "Batch"],
      [`${selectedLevel?.name ?? "Level"} - ${selectedTerm?.name ?? "Term"}`],
      [],
    ];

    const dataWorksheet = XLSX.utils.aoa_to_sheet(headingRows);
    XLSX.utils.sheet_add_json(dataWorksheet, exportRows, { origin: "A6" });
    dataWorksheet["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 20 },
      { wch: 30 },
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dataWorksheet, "Registration Codes");
    XLSX.writeFile(
      workbook,
      `JTEC-Registration-Codes-${
        selectedBatch?.name?.replace(/\s+/g, "-") ?? "Batch"
      }.xlsx`,
    );
  }

  function handlePrint() {
    if (generatedRegistrations.length === 0) return;
    window.print();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6 print:hidden">
        <div>
          <h2 className="font-serif text-lg font-bold text-white">
            Academic Assignment
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            This assignment will apply to all students in the uploaded file.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ModernDropdown
            label="Department"
            value={departmentId}
            onChange={(val) => {
              setDepartmentId(val);
              clearMessages();
            }}
            placeholder="Select Department"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />

          <ModernDropdown
            label="Batch"
            value={batchId}
            onChange={(val) => {
              setBatchId(val);
              clearMessages();
            }}
            placeholder="Select Batch"
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
          />

          <ModernDropdown
            label="Level"
            value={levelId}
            onChange={handleLevelChange}
            placeholder="Select Level"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
          />

          <ModernDropdown
            label="Term"
            value={termId}
            disabled={!levelId}
            onChange={(val) => {
              setTermId(val);
              clearMessages();
            }}
            placeholder={levelId ? "Select Term" : "Select Level First"}
            options={filteredTerms.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>

        {/* Excel Upload Dropzone */}
        <div className="rounded-2xl border border-dashed border-emerald-500/35 bg-[#060A12]/90 p-6 transition-colors hover:border-emerald-400/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-400">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <label
                  htmlFor="student-file"
                  className="block text-sm font-semibold text-white"
                >
                  Student List (.xlsx, .xls, .csv)
                </label>
                <p className="mt-0.5 text-xs text-slate-400">
                  Required columns: Student ID and Name. Roll is optional.
                </p>
              </div>
            </div>

            {fileName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {fileName}
              </span>
            )}
          </div>

          <input
            id="student-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="mt-4 block w-full cursor-pointer text-xs text-slate-300 file:mr-4 file:cursor-pointer file:rounded-xl file:border file:border-emerald-500/40 file:bg-emerald-500/15 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-emerald-300 file:transition-all hover:file:bg-emerald-500/25"
          />
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs font-medium text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {students.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#060A12]/80">
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0A1020] px-5 py-3.5">
              <div>
                <h3 className="text-xs font-semibold text-white">
                  Student Preview
                </h3>
                <p className="text-[11px] text-slate-400">
                  {students.length} students loaded.
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                {students.length} ready
              </span>
            </div>

            <div className="max-h-80 overflow-auto">
              <table className="min-w-full divide-y divide-slate-800/70 text-xs">
                <thead className="sticky top-0 bg-[#0A1020] text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">SL</th>
                    <th className="px-4 py-3 text-left font-semibold">Roll</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Student ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.map((student, index) => (
                    <tr
                      key={student.student_id}
                      className="transition-colors hover:bg-slate-900/50"
                    >
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {student.roll || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        {student.student_id}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {student.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              isReadingFile ||
              isGenerating ||
              students.length === 0 ||
              !departmentId ||
              !batchId ||
              !levelId ||
              !termId
            }
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(16,185,129,0.3)] transition-all duration-150 hover:from-emerald-300 hover:to-emerald-400 hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {isReadingFile ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Reading File...</span>
              </>
            ) : isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>
                  {`Generate ${students.length} Registration ${
                    students.length === 1 ? "Code" : "Codes"
                  }`}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {generatedRegistrations.length > 0 && (
        <section
          id="registration-code-result"
          className="space-y-5 border-t border-slate-800/80 pt-8"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Generation Complete
              </p>
              <h2 className="mt-1 font-serif text-xl font-bold text-white">
                Registration Codes
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {selectedDepartment?.name} &bull; {selectedBatch?.name} &bull;{" "}
                {selectedLevel?.name} &bull; {selectedTerm?.name}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-emerald-500/50 hover:text-emerald-300 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Excel</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.3)] transition-all hover:from-emerald-300 hover:to-emerald-400 active:scale-95"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#060A12]/80">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800/70 text-xs">
                <thead className="bg-[#0A1020] text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">SL</th>
                    <th className="px-4 py-3 text-left font-semibold">Roll</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Student ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Registration Code
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {generatedRegistrations.map((registration, index) => {
                    const originalStudent = students.find(
                      (student) =>
                        student.student_id === registration.student_id,
                    );

                    return (
                      <tr
                        key={registration.student_id}
                        className="transition-colors hover:bg-slate-900/50"
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {registration.roll ?? originalStudent?.roll ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-white">
                          {registration.student_id}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {registration.name ?? originalStudent?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 font-mono font-bold tracking-wide text-emerald-300">
                            {registration.code}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden;
          }
          #registration-code-result,
          #registration-code-result * {
            visibility: visible;
            color: #111827 !important;
            background: transparent !important;
            border-color: #d1d5db !important;
          }
          #registration-code-result {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          #registration-code-result table {
            width: 100%;
            border-collapse: collapse;
          }
          #registration-code-result th,
          #registration-code-result td {
            border: 1px solid #d1d5db !important;
            padding: 8px;
          }
          #registration-code-result th {
            background: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  );
}