"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { SubjectItem } from "./subject-item";

type Department = { id: string; name: string; code: string };
type Level = { id: string; name: string; sort_order: number };
type Term = { id: string; level_id: string; name: string; sort_order: number };
type Subject = {
  id: string;
  department_id: string;
  level_id: string;
  term_id: string;
  subject_code: string;
  subject_name: string;
};

const PAGE_SIZE = 15;

function FilterDropdown({
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
    const out = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  const currentLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div ref={ref} className="relative min-w-[165px]">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all ${
          open
            ? "border-sky-400/80 bg-slate-900 text-white ring-2 ring-sky-500/20"
            : "border-sky-500/25 bg-gradient-to-r from-slate-950 via-sky-950/25 to-slate-950 text-slate-200 hover:border-sky-400/50"
        }`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180 text-sky-400" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-60 w-full min-w-[195px] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1224]/95 p-1.5 shadow-2xl backdrop-blur-xl">
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
                    ? "bg-sky-500/15 font-semibold text-sky-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SubjectsBrowser({
  departments,
  levels,
  terms,
  subjects,
  updateAction,
  deleteAction,
}: {
  departments: Department[];
  levels: Level[];
  terms: Term[];
  subjects: Subject[];
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const deptById = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments],
  );
  const levelById = useMemo(
    () => new Map(levels.map((l) => [l.id, l])),
    [levels],
  );
  const termById = useMemo(
    () => new Map(terms.map((t) => [t.id, t])),
    [terms],
  );

  const availableTerms = useMemo(() => {
    if (levelFilter === "all") return terms;
    return terms.filter((t) => t.level_id === levelFilter);
  }, [terms, levelFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchSearch =
        q.length === 0 ||
        s.subject_code.toLowerCase().includes(q) ||
        s.subject_name.toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || s.department_id === deptFilter;
      const matchLevel = levelFilter === "all" || s.level_id === levelFilter;
      const matchTerm = termFilter === "all" || s.term_id === termFilter;
      return matchSearch && matchDept && matchLevel && matchTerm;
    });
  }, [subjects, search, deptFilter, levelFilter, termFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, deptFilter, levelFilter, termFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
      <div className="flex flex-col gap-4 border-b border-slate-800/80 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">
            Existing Subjects
          </h2>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-0.5 text-xs font-semibold text-sky-300">
            {filtered.length} subjects found
          </span>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              aria-label="Search subjects"
              className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-3 text-xs text-white placeholder:text-slate-400 focus:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <FilterDropdown
            value={deptFilter}
            onChange={setDeptFilter}
            placeholder="All Departments"
            options={[
              { value: "all", label: "All Departments" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          <FilterDropdown
            value={levelFilter}
            onChange={(val) => {
              setLevelFilter(val);
              setTermFilter("all");
            }}
            placeholder="All Levels"
            options={[
              { value: "all", label: "All Levels" },
              ...levels.map((l) => ({ value: l.id, label: l.name })),
            ]}
          />

          <FilterDropdown
            value={termFilter}
            onChange={setTermFilter}
            placeholder="All Terms"
            options={[
              { value: "all", label: "All Terms" },
              ...availableTerms.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-400">
          No matching subjects found.
        </div>
      ) : (
        <div className="space-y-2.5 p-5">
          {paginated.map((subject) => (
            <SubjectItem
              key={subject.id}
              subject={subject}
              departmentLabel={deptById.get(subject.department_id)?.code}
              levelLabel={levelById.get(subject.level_id)?.name}
              termLabel={termById.get(subject.term_id)?.name}
              updateAction={updateAction}
              deleteAction={deleteAction}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-[#060A12]/40 px-6 py-3.5 text-xs">
          <span className="text-slate-400">
            Showing {(safePage - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length} subjects
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:border-sky-500/50 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-300">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:border-sky-500/50 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}