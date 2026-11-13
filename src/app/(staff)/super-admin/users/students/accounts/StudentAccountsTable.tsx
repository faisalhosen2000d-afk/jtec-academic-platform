"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import DeleteStudentButton from "./DeleteStudentButton";
import BulkDeleteStudentsButton from "./BulkDeleteStudentsButton";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  is_verified: boolean;
  upload_disabled: boolean;
  created_at: string;
};

type StudentAccountsTableProps = {
  students: StudentProfile[];
};

const PAGE_SIZE = 15;

export default function StudentAccountsTable({
  students,
}: StudentAccountsTableProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "VERIFIED" | "PENDING" | "UPLOAD_DISABLED"
  >("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === "VERIFIED" && !s.is_verified) return false;
      if (statusFilter === "PENDING" && s.is_verified) return false;
      if (statusFilter === "UPLOAD_DISABLED" && !s.upload_disabled) {
        return false;
      }
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        (s.student_id ?? "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    });
  }, [students, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const allPageSelected =
    paginated.length > 0 &&
    paginated.every((s) => selectedStudentIds.includes(s.id));

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function toggleAllOnPage() {
    if (allPageSelected) {
      const pageIds = new Set(paginated.map((s) => s.id));
      setSelectedStudentIds((curr) => curr.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set([
        ...selectedStudentIds,
        ...paginated.map((s) => s.id),
      ]);
      setSelectedStudentIds(Array.from(merged));
    }
  }

  function clearSelection() {
    setSelectedStudentIds([]);
  }

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
      {/* Search + Filter Bar */}
      <div className="space-y-4 border-b border-slate-800/80 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-white">
              Registered Student Accounts
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Showing {filtered.length} of {students.length} student accounts.
            </p>
          </div>

          <BulkDeleteStudentsButton
            selectedStudentIds={selectedStudentIds}
            onDeleted={clearSelection}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student name, roll, or email..."
              className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-3.5 text-xs text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "ALL", label: "All" },
                { key: "VERIFIED", label: "Verified" },
                { key: "PENDING", label: "Pending" },
                { key: "UPLOAD_DISABLED", label: "Upload Disabled" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setStatusFilter(item.key);
                  setPage(1);
                }}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                  statusFilter === item.key
                    ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "border-slate-800 bg-[#060A12] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {selectedStudentIds.length > 0 ? (
          <p className="text-xs font-semibold text-cyan-300">
            {selectedStudentIds.length}{" "}
            {selectedStudentIds.length === 1 ? "student" : "students"} selected
            for bulk action
          </p>
        ) : null}
      </div>

      {paginated.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-400">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">
            No matching student accounts
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="border-b border-slate-800/80 bg-[#060A12] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all students on page"
                    className="h-4 w-4 rounded accent-cyan-500"
                  />
                </th>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Student ID</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Verification</th>
                <th className="px-5 py-3.5">Upload Permission</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {paginated.map((student) => (
                <tr
                  key={student.id}
                  className="transition-colors hover:bg-slate-900/45"
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      aria-label={`Select ${student.full_name}`}
                      className="h-4 w-4 rounded accent-cyan-500"
                    />
                  </td>

                  <td className="px-5 py-4 font-semibold text-white">
                    {student.full_name}
                  </td>

                  <td className="px-5 py-4">
                    {student.student_id ? (
                      <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                        {student.student_id}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-slate-300">{student.email}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        student.is_verified
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {student.is_verified ? "Verified" : "Pending"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        student.upload_disabled
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                          : "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                      }`}
                    >
                      {student.upload_disabled ? "Disabled" : "Enabled"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-400">
                    {new Date(student.created_at).toLocaleDateString("en-GB")}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <DeleteStudentButton
                      studentId={student.id}
                      studentName={student.full_name}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 px-6 py-4 text-xs text-slate-400">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1} –{" "}
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-[#060A12] px-3 font-semibold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-semibold text-slate-200">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-[#060A12] px-3 font-semibold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}