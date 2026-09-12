"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
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
  const normalizedPossibleHeaders = possibleHeaders.map(
    normalizeHeader,
  );

  for (const [key, value] of Object.entries(row)) {
    if (
      normalizedPossibleHeaders.includes(
        normalizeHeader(key),
      )
    ) {
      return String(value ?? "").trim();
    }
  }

  return "";
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

  const [generatedRegistrations, setGeneratedRegistrations] =
    useState<GeneratedRegistration[]>([]);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredTerms = useMemo(() => {
    if (!levelId) {
      return [];
    }

    return terms.filter(
      (term) => term.level_id === levelId,
    );
  }, [levelId, terms]);

  const selectedDepartment = departments.find(
    (department) => department.id === departmentId,
  );

  const selectedBatch = batches.find(
    (batch) => batch.id === batchId,
  );

  const selectedLevel = levels.find(
    (level) => level.id === levelId,
  );

  const selectedTerm = filteredTerms.find(
    (term) => term.id === termId,
  );

  function handleLevelChange(value: string) {
    setLevelId(value);
    setTermId("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
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
      const allowedExtensions = [
        ".xlsx",
        ".xls",
        ".csv",
      ];

      const lowerFileName = file.name.toLowerCase();

      const isAllowed = allowedExtensions.some(
        (extension) =>
          lowerFileName.endsWith(extension),
      );

      if (!isAllowed) {
        throw new Error(
          "Please upload an Excel (.xlsx/.xls) or CSV file.",
        );
      }

      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
      });

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error(
          "The uploaded file does not contain a worksheet.",
        );
      }

      const worksheet =
        workbook.Sheets[firstSheetName];

      if (!worksheet) {
        throw new Error(
          "The first worksheet could not be read.",
        );
      }

      const rows = XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(worksheet, {
        defval: "",
        raw: false,
      });

      if (rows.length === 0) {
        throw new Error(
          "The uploaded file is empty.",
        );
      }

      const parsedStudents: StudentRow[] = [];

      for (
        let index = 0;
        index < rows.length;
        index += 1
      ) {
        const row = rows[index];

        if (!row) {
          continue;
        }

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

        if (!studentId && !name && !roll) {
          continue;
        }

        if (!studentId) {
          throw new Error(
            `Student ID is missing at Excel row ${
              index + 2
            }.`,
          );
        }

        if (!name) {
          throw new Error(
            `Student Name is missing at Excel row ${
              index + 2
            }.`,
          );
        }

        parsedStudents.push({
          roll,
          student_id: studentId,
          name,
        });
      }

      if (parsedStudents.length === 0) {
        throw new Error(
          "No valid student rows were found.",
        );
      }

      if (parsedStudents.length > 1000) {
        throw new Error(
          "Maximum 1000 students can be uploaded at once.",
        );
      }

      const duplicateStudentIds =
        parsedStudents
          .map(
            (student) => student.student_id,
          )
          .filter(
            (studentId, index, all) =>
              all.indexOf(studentId) !== index,
          );

      if (duplicateStudentIds.length > 0) {
        const uniqueDuplicates =
          Array.from(
            new Set(duplicateStudentIds),
          );

        throw new Error(
          `Duplicate Student ID found: ${uniqueDuplicates.join(
            ", ",
          )}`,
        );
      }

      setStudents(parsedStudents);

      setSuccessMessage(
        `${parsedStudents.length} students loaded successfully.`,
      );
    } catch (error) {
      setStudents([]);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to read the uploaded file.";

      setErrorMessage(message);
    } finally {
      setIsReadingFile(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    clearMessages();

    if (isReadingFile) {
      setErrorMessage(
        "Please wait until the file finishes loading.",
      );
      return;
    }

    if (!departmentId) {
      setErrorMessage(
        "Please select a Department.",
      );
      return;
    }

    if (!batchId) {
      setErrorMessage(
        "Please select a Batch.",
      );
      return;
    }

    if (!levelId) {
      setErrorMessage(
        "Please select a Level.",
      );
      return;
    }

    if (!termId) {
      setErrorMessage(
        "Please select a Term.",
      );
      return;
    }

    if (students.length === 0) {
      setErrorMessage(
        "Please upload a student list first.",
      );
      return;
    }

    const formData = new FormData();

    formData.set(
      "department_id",
      departmentId,
    );

    formData.set(
      "batch_id",
      batchId,
    );

    formData.set(
      "level_id",
      levelId,
    );

    formData.set(
      "term_id",
      termId,
    );

    formData.set(
      "students",
      JSON.stringify(students),
    );

    setIsGenerating(true);

    try {
      const result = await action(formData);

      if (!result.success) {
        throw new Error(
          "Registration codes could not be generated.",
        );
      }

      setGeneratedRegistrations(
        result.registrations ?? [],
      );

      setSuccessMessage(
        `${result.count} registration ${
          result.count === 1
            ? "code"
            : "codes"
        } generated successfully.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate registration codes.";

      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownloadExcel() {
    if (
      generatedRegistrations.length === 0
    ) {
      return;
    }

    const exportRows =
      generatedRegistrations.map(
        (registration, index) => {
          const originalStudent =
            students.find(
              (student) =>
                student.student_id ===
                registration.student_id,
            );

          return {
            SL: index + 1,
            Roll:
              registration.roll ??
              originalStudent?.roll ??
              "",
            "Student ID":
              registration.student_id,
            "Student Name":
              registration.name ??
              originalStudent?.name ??
              "",
            "Registration Code":
              registration.code,
          };
        },
      );

    const headingRows = [
      [
        "Jhenaidah Textile Engineering College",
      ],
      [
        selectedDepartment?.name ??
          "Department",
      ],
      [
        selectedBatch?.name ??
          "Batch",
      ],
      [
        `${selectedLevel?.name ?? "Level"} - ${
          selectedTerm?.name ?? "Term"
        }`,
      ],
      [],
    ];

    const dataWorksheet =
      XLSX.utils.aoa_to_sheet(
        headingRows,
      );

    XLSX.utils.sheet_add_json(
      dataWorksheet,
      exportRows,
      {
        origin: "A6",
      },
    );

    dataWorksheet["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 20 },
      { wch: 30 },
      { wch: 24 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      dataWorksheet,
      "Registration Codes",
    );

    XLSX.writeFile(
      workbook,
      `JTEC-Registration-Codes-${
        selectedBatch?.name
          ?.replace(/\s+/g, "-") ??
        "Batch"
      }.xlsx`,
    );
  }

  function handlePrint() {
    if (
      generatedRegistrations.length === 0
    ) {
      return;
    }

    window.print();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Academic Assignment
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              This assignment will apply to
              all students in the uploaded
              file.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="department_id"
                className="text-sm font-medium text-slate-950"
              >
                Department
              </label>

              <select
                id="department_id"
                value={departmentId}
                onChange={(event) => {
                  setDepartmentId(
                    event.target.value,
                  );
                  clearMessages();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  Select Department
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="batch_id"
                className="text-sm font-medium text-slate-950"
              >
                Batch
              </label>

              <select
                id="batch_id"
                value={batchId}
                onChange={(event) => {
                  setBatchId(
                    event.target.value,
                  );
                  clearMessages();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  Select Batch
                </option>

                {batches.map((batch) => (
                  <option
                    key={batch.id}
                    value={batch.id}
                  >
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="level_id"
                className="text-sm font-medium text-slate-950"
              >
                Level
              </label>

              <select
                id="level_id"
                value={levelId}
                onChange={(event) =>
                  handleLevelChange(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  Select Level
                </option>

                {levels.map((level) => (
                  <option
                    key={level.id}
                    value={level.id}
                  >
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="term_id"
                className="text-sm font-medium text-slate-950"
              >
                Term
              </label>

              <select
                id="term_id"
                value={termId}
                onChange={(event) => {
                  setTermId(
                    event.target.value,
                  );
                  clearMessages();
                }}
                disabled={!levelId}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {levelId
                    ? "Select Term"
                    : "Select Level First"}
                </option>

                {filteredTerms.map(
                  (term) => (
                    <option
                      key={term.id}
                      value={term.id}
                    >
                      {term.name}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="student-file"
              className="text-sm font-medium text-slate-950"
            >
              Student List
            </label>

            <div className="mt-2 rounded-xl border border-slate-300 bg-white p-3">
              <input
                id="student-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-slate-900 hover:file:bg-slate-200"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Required columns: Student ID
              and Name. Roll is optional.
            </p>

            {fileName && (
              <p className="mt-2 text-sm font-medium text-slate-700">
                Selected: {fileName}
              </p>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {students.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                Student Preview
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {students.length} students
                loaded.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-96 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        SL
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        Roll
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        Student ID
                      </th>

                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        Name
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map(
                      (student, index) => (
                        <tr
                          key={
                            student.student_id
                          }
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-4 py-3 text-slate-600">
                            {index + 1}
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {student.roll ||
                              "—"}
                          </td>

                          <td className="px-4 py-3 font-medium text-slate-900">
                            {
                              student.student_id
                            }
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {student.name}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
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
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isReadingFile
              ? "Reading File..."
              : isGenerating
                ? "Generating..."
                : `Generate ${students.length} Registration ${
                    students.length === 1
                      ? "Code"
                      : "Codes"
                  }`}
          </button>
        </div>
      </form>

      {generatedRegistrations.length >
        0 && (
        <section
          id="registration-code-result"
          className="space-y-5 border-t border-slate-200 pt-8"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                Generation Complete
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Registration Codes
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {selectedDepartment?.name}
                {" • "}
                {selectedBatch?.name}
                {" • "}
                {selectedLevel?.name}
                {" • "}
                {selectedTerm?.name}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Download Excel
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Print / Save PDF
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">
                      SL
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-900">
                      Roll
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-900">
                      Student ID
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-900">
                      Student Name
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-900">
                      Registration Code
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {generatedRegistrations.map(
                    (
                      registration,
                      index,
                    ) => {
                      const originalStudent =
                        students.find(
                          (student) =>
                            student.student_id ===
                            registration.student_id,
                        );

                      return (
                        <tr
                          key={
                            registration.student_id
                          }
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-4 py-3 text-slate-600">
                            {index + 1}
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {registration.roll ??
                              originalStudent?.roll ??
                              "—"}
                          </td>

                          <td className="px-4 py-3 font-medium text-slate-900">
                            {
                              registration.student_id
                            }
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {registration.name ??
                              originalStudent?.name ??
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono font-semibold tracking-wide text-slate-950">
                              {
                                registration.code
                              }
                            </span>
                          </td>
                        </tr>
                      );
                    },
                  )}
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
          }

          body * {
            visibility: hidden;
          }

          #registration-code-result,
          #registration-code-result * {
            visibility: visible;
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
            border: 1px solid #d1d5db;
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