"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department_id: string | null;
  is_verified: boolean;
  upload_disabled: boolean;
};

type Department = {
  id: string;
  name: string;
};

const PAGE_SIZE = 15;

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const currentLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div ref={ref} className="relative min-w-[175px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all ${
          open
            ? "border-indigo-400/80 bg-slate-900 text-white ring-2 ring-indigo-500/20"
            : "border-indigo-500/25 bg-gradient-to-r from-slate-950 via-indigo-950/25 to-slate-950 text-slate-200 hover:border-indigo-400/50"
        }`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-indigo-400" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-60 w-full min-w-[200px] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1224]/95 p-1.5 shadow-2xl backdrop-blur-xl">
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
                    ? "bg-indigo-500/15 font-semibold text-indigo-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminUploadPermissionsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  async function loadStudents() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/staff-login";
      return;
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!currentProfile || currentProfile.role !== "admin") {
      window.location.href = "/";
      return;
    }

    const { data: scopes, error: scopesError } = await supabase
      .from("staff_scopes")
      .select("department_id")
      .eq("profile_id", user.id)
      .eq("can_manage_upload_permission", true);

    if (scopesError || !scopes || scopes.length === 0) {
      setError(
        "You do not have permission to manage student upload permissions.",
      );
      setLoading(false);
      return;
    }

    const { data: studentsData, error: studentsError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, student_id, email, department_id, is_verified, upload_disabled",
      )
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (studentsError) {
      setError("Unable to load student upload permissions.");
      setLoading(false);
      return;
    }

    const { data: departmentsData } = await supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });

    setStudents((studentsData ?? []) as StudentProfile[]);
    setDepartments((departmentsData ?? []) as Department[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  async function toggleUploadPermission(student: StudentProfile) {
    setUpdatingId(student.id);
    setError("");

    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc(
      "set_student_upload_disabled",
      {
        p_student_id: student.id,
        p_upload_disabled: !student.upload_disabled,
      },
    );

    if (rpcError) {
      setError(rpcError.message);
      setUpdatingId(null);
      return;
    }

    setStudents((current) =>
      current.map((item) =>
        item.id === student.id
          ? {
              ...item,
              upload_disabled: !item.upload_disabled,
            }
          : item,
      ),
    );

    setUpdatingId(null);
  }

  function getDepartmentName(departmentId: string | null) {
    if (!departmentId) {
      return "—";
    }

    return (
      departments.find((department) => department.id === departmentId)?.name ??
      "Unknown"
    );
  }

  const enabledCount = useMemo(
    () => students.filter((s) => !s.upload_disabled).length,
    [students],
  );
  const disabledCount = useMemo(
    () => students.filter((s) => s.upload_disabled).length,
    [students],
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        q.length === 0 ||
        student.full_name.toLowerCase().includes(q) ||
        (student.student_id ?? "").toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q);

      const matchesDepartment =
        departmentFilter === "all" ||
        student.department_id === departmentFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && !student.upload_disabled) ||
        (statusFilter === "disabled" && student.upload_disabled);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [students, search, departmentFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <main className="min-h-screen bg-[#060A12] text-slate-100">
      <header className="pt-6 pb-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-950 shadow-[0_0_18px_rgba(99,102,241,0.45)]">
                <ShieldCheck className="h-3 w-3" />
                Access Control
              </span>
              <span className="text-xs text-slate-400">Staff Administration</span>
            </div>
            <h1 className="mt-2.5 font-serif text-2xl font-bold text-white sm:text-3xl">
              Upload Permissions
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage student material-upload permissions within your assigned
              department scope.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-indigo-500/50 hover:text-indigo-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Admin Console</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Slim Permission Scope Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 px-4 py-3 text-xs text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-indigo-300">
              Permission Scope:
            </span>{" "}
            Only students within your assigned Admin scope can be managed. The
            database function performs the final authorization check before any
            upload permission is changed.
          </p>
        </div>

        {/* 3 Compact KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-500/30 bg-[#0A1020] p-5 shadow-[0_0_25px_rgba(99,102,241,0.06)] transition-all hover:border-indigo-400/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Students
              </span>
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {loading ? "—" : students.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-[0_0_25px_rgba(16,185,129,0.06)] transition-all hover:border-emerald-400/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Upload Enabled
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {loading ? "—" : enabledCount}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-500/30 bg-[#0A1020] p-5 shadow-[0_0_25px_rgba(244,63,94,0.06)] transition-all hover:border-rose-400/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Upload Disabled
              </span>
              <Ban className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-300">
              {loading ? "—" : disabledCount}
            </p>
          </div>
        </div>

        {/* Main Table Card */}
        <section className="rounded-2xl border border-indigo-500/30 bg-[#0A1020] shadow-[0_0_35px_rgba(99,102,241,0.08)] transition-all duration-300 hover:border-indigo-400/50">
          <div className="flex flex-col gap-4 border-b border-slate-800/80 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Student Upload Permissions
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Enable or disable material uploading for individual student
                accounts.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, ID, or email..."
                  aria-label="Search students"
                  className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-3 text-xs text-slate-100 placeholder:text-slate-400 focus:border-indigo-400/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <ModernDropdown
                value={departmentFilter}
                onChange={setDepartmentFilter}
                placeholder="All Departments"
                options={[
                  { value: "all", label: "All Departments" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />

              <ModernDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
                options={[
                  { value: "all", label: "All Status" },
                  { value: "enabled", label: "Enabled Only" },
                  { value: "disabled", label: "Disabled Only" },
                ]}
              />
            </div>
          </div>

          {error && (
            <div className="border-b border-slate-800/80 p-5">
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-4">
                <p className="text-xs font-semibold text-rose-300">
                  Unable to update upload permission.
                </p>
                <p className="mt-1 text-xs text-slate-300">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Loading student accounts...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-sm font-semibold text-white">
                No matching student accounts
              </h3>
              <p className="mt-1.5 text-xs text-slate-400">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="border-b border-slate-800/80 bg-[#060A12]/70 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Student</th>
                      <th className="px-5 py-3.5 font-semibold">Student ID</th>
                      <th className="px-5 py-3.5 font-semibold">Email</th>
                      <th className="px-5 py-3.5 font-semibold">Department</th>
                      <th className="px-5 py-3.5 font-semibold">Verification</th>
                      <th className="px-5 py-3.5 font-semibold">
                        Upload Permission
                      </th>
                      <th className="px-5 py-3.5 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/70">
                    {paginatedStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="transition-colors hover:bg-slate-900/50"
                      >
                        <td className="px-5 py-4 font-semibold text-white">
                          {student.full_name}
                        </td>

                        <td className="px-5 py-4 font-mono text-slate-300">
                          {student.student_id ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {student.email}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {getDepartmentName(student.department_id)}
                        </td>

                        <td className="px-5 py-4">
                          {student.is_verified ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {student.upload_disabled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/35 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Enabled
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            disabled={updatingId === student.id}
                            onClick={() => void toggleUploadPermission(student)}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                              student.upload_disabled
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/25 hover:shadow-[0_0_16px_rgba(16,185,129,0.25)]"
                                : "border-rose-500/35 bg-rose-500/10 text-rose-300 hover:border-rose-400 hover:bg-rose-500/20 hover:shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                            }`}
                          >
                            {updatingId === student.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : student.upload_disabled ? (
                              <span>Enable Upload</span>
                            ) : (
                              <span>Disable Upload</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-[#060A12]/40 px-5 py-3.5 text-xs">
                <span className="text-slate-400">
                  Showing {(safePage - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(safePage * PAGE_SIZE, filteredStudents.length)} of{" "}
                  {filteredStudents.length} students
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-medium text-slate-300">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage === totalPages}
                    className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:border-indigo-500/50 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}