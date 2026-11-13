"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department_id: string | null;
  batch_id: string | null;
  current_level_id: string | null;
  current_term_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  upload_disabled: boolean;
};

type Department = { id: string; name: string };
type Batch = { id: string; name: string };
type Level = { id: string; name: string; sort_order: number };
type Term = { id: string; level_id: string; name: string; sort_order: number };

const PAGE_SIZE = 15;

type DropdownOption = { value: string; label: string };

function ModernFilterDropdown({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-[#060A12] px-3.5 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
          open
            ? "border-emerald-400/80 ring-2 ring-emerald-500/20"
            : "border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <span className="truncate">{selected?.label ?? "All"}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? "rotate-180 text-emerald-300" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full min-w-[190px] overflow-y-auto rounded-xl border border-emerald-500/35 bg-[#0A1020] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
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
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-emerald-500/20 font-semibold text-emerald-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default function UploadPermissionsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ENABLED" | "DISABLED"
  >("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [page, setPage] = useState(1);

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

    if (!currentProfile || currentProfile.role !== "super_admin") {
      window.location.href = "/";
      return;
    }

    const [studentsRes, deptsRes, batchesRes, levelsRes, termsRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, student_id, email, department_id, batch_id, current_level_id, current_term_id, avatar_url, is_verified, upload_disabled",
          )
          .eq("role", "student")
          .order("created_at", { ascending: false }),
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("batches").select("id, name").order("name"),
        supabase
          .from("levels")
          .select("id, name, sort_order")
          .order("sort_order"),
        supabase
          .from("terms")
          .select("id, level_id, name, sort_order")
          .order("sort_order"),
      ]);

    if (studentsRes.error) {
      setError("Unable to load student upload permissions.");
      setLoading(false);
      return;
    }

    setStudents((studentsRes.data ?? []) as StudentProfile[]);
    setDepartments((deptsRes.data ?? []) as Department[]);
    setBatches((batchesRes.data ?? []) as Batch[]);
    setLevels((levelsRes.data ?? []) as Level[]);
    setTerms((termsRes.data ?? []) as Term[]);
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

  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments],
  );
  const batchMap = useMemo(
    () => new Map(batches.map((b) => [b.id, b.name])),
    [batches],
  );
  const levelMap = useMemo(
    () => new Map(levels.map((l) => [l.id, l.name])),
    [levels],
  );
  const termMap = useMemo(
    () => new Map(terms.map((t) => [t.id, t.name])),
    [terms],
  );

  const availableTerms = useMemo(() => {
    if (levelFilter === "ALL") return terms;
    return terms.filter((t) => t.level_id === levelFilter);
  }, [terms, levelFilter]);

  const enabledCount = useMemo(
    () => students.filter((s) => !s.upload_disabled).length,
    [students],
  );
  const disabledCount = students.length - enabledCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === "ENABLED" && s.upload_disabled) return false;
      if (statusFilter === "DISABLED" && !s.upload_disabled) return false;
      if (departmentFilter !== "ALL" && s.department_id !== departmentFilter) {
        return false;
      }
      if (batchFilter !== "ALL" && s.batch_id !== batchFilter) return false;
      if (levelFilter !== "ALL" && s.current_level_id !== levelFilter) {
        return false;
      }
      if (termFilter !== "ALL" && s.current_term_id !== termFilter) {
        return false;
      }
      if (!q) return true;

      const deptName = s.department_id
        ? (deptMap.get(s.department_id) ?? "")
        : "";
      return (
        s.full_name.toLowerCase().includes(q) ||
        (s.student_id ?? "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q)
      );
    });
  }, [
    students,
    statusFilter,
    departmentFilter,
    batchFilter,
    levelFilter,
    termFilter,
    search,
    deptMap,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    departmentFilter !== "ALL" ||
    batchFilter !== "ALL" ||
    levelFilter !== "ALL" ||
    termFilter !== "ALL";

  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setDepartmentFilter("ALL");
    setBatchFilter("ALL");
    setLevelFilter("ALL");
    setTermFilter("ALL");
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.22)]">
                <UploadCloud className="h-3 w-3" />
                Upload Permissions
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Student Upload Permissions
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Filter by department, batch, level, or term to enable or restrict
              student material uploads.
            </p>
          </div>

          <Link
            href="/super-admin/users/students"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:text-emerald-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Students</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* 3 Live KPI Cards with Hover Glow */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(6,182,212,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Students
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {loading ? "—" : students.length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(16,185,129,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Upload Enabled
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-300">
              {loading ? "—" : enabledCount}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(244,63,94,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Upload Disabled
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-rose-300">
              {loading ? "—" : disabledCount}
            </p>
          </div>
        </section>

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-5 py-3.5 text-xs font-semibold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Main Controls Card */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl transition-all duration-200 hover:border-emerald-500/35 hover:shadow-[0_14px_40px_rgba(16,185,129,0.08)]">
          <div className="space-y-4 border-b border-slate-800/80 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-white">
                  Student Upload Controls
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Showing{" "}
                  <span className="font-semibold text-emerald-300">
                    {filtered.length}
                  </span>{" "}
                  of {students.length} students matching your filters.
                </p>
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-300 transition-all hover:border-emerald-500/40 hover:text-emerald-300 active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Filters</span>
                </button>
              ) : null}
            </div>

            {/* Search + Status Pills */}
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
                  placeholder="Search name, roll, email, or department..."
                  className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-3.5 text-xs text-white placeholder:text-slate-500 transition-all focus:border-emerald-400/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(["ALL", "ENABLED", "DISABLED"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(1);
                    }}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      statusFilter === status
                        ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "border-slate-800 bg-[#060A12] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {status === "ALL"
                      ? "All"
                      : status === "ENABLED"
                        ? "Enabled"
                        : "Disabled"}
                  </button>
                ))}
              </div>
            </div>

            {/* Academic Filters: Department, Batch, Level, Term */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Department
                </span>
                <ModernFilterDropdown
                  value={departmentFilter}
                  onChange={(val) => {
                    setDepartmentFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "All Departments" },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Batch
                </span>
                <ModernFilterDropdown
                  value={batchFilter}
                  onChange={(val) => {
                    setBatchFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "All Batches" },
                    ...batches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Level
                </span>
                <ModernFilterDropdown
                  value={levelFilter}
                  onChange={(val) => {
                    setLevelFilter(val);
                    setTermFilter("ALL");
                    setPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "All Levels" },
                    ...levels.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                />
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Term
                </span>
                <ModernFilterDropdown
                  value={termFilter}
                  onChange={(val) => {
                    setTermFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "All Terms" },
                    ...availableTerms.map((t) => ({
                      value: t.id,
                      label: t.name,
                    })),
                  ]}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Loading student upload permissions...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-serif text-base font-bold text-white">
                No matching students found
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Try adjusting your search query or academic filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {paginated.map((student) => {
                const isUpdating = updatingId === student.id;
                const deptName = student.department_id
                  ? (deptMap.get(student.department_id) ?? "Department")
                  : "Unassigned";
                const batchName = student.batch_id
                  ? batchMap.get(student.batch_id)
                  : null;
                const levelName = student.current_level_id
                  ? levelMap.get(student.current_level_id)
                  : null;
                const termName = student.current_term_id
                  ? termMap.get(student.current_term_id)
                  : null;

                return (
                  <div
                    key={student.id}
                    className="flex flex-col gap-4 px-6 py-4 transition-all duration-150 hover:bg-[#0D162B]/90 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={student.full_name}
                          className="h-10 w-10 shrink-0 rounded-full border border-emerald-500/40 object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-bold text-emerald-300">
                          {getInitials(student.full_name)}
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-white">
                            {student.full_name}
                          </p>
                          {student.student_id ? (
                            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                              {student.student_id}
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                              student.upload_disabled
                                ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            }`}
                          >
                            {student.upload_disabled ? (
                              <ShieldAlert className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {student.upload_disabled ? "Disabled" : "Enabled"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>{student.email}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-cyan-300">{deptName}</span>
                          {batchName ? (
                            <>
                              <span className="text-slate-600">·</span>
                              <span>{batchName}</span>
                            </>
                          ) : null}
                          {levelName || termName ? (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-300">
                                {[levelName, termName].filter(Boolean).join(" / ")}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => void toggleUploadPermission(student)}
                        className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                          student.upload_disabled
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/25 hover:shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                            : "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:border-rose-400 hover:bg-rose-500/25 hover:shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        <span>
                          {student.upload_disabled
                            ? "Enable Uploads"
                            : "Disable Uploads"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-[#060A12] px-3 font-semibold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-[#060A12] px-3 font-semibold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400 transition-all duration-200 hover:border-emerald-500/35 hover:bg-[#0D162B]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Permission Enforcement:
            </span>{" "}
            Upload restrictions are enforced server-side via the{" "}
            <code className="text-emerald-300">set_student_upload_disabled</code>{" "}
            database function and Row Level Security (RLS).
          </p>
        </section>
      </main>
    </div>
  );
}