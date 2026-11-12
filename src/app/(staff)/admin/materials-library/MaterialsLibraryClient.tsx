"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getStaffMaterialAccessUrl } from "./actions";
import {
  ArrowLeft,
  Search,
  ExternalLink,
  Download,
  BookOpen,
  Filter,
  RotateCcw,
  FileText,
  Presentation,
} from "lucide-react";

export interface LibraryMaterialItem {
  id: string;
  title: string;
  description: string | null;
  file_type: string | null;
  created_at: string;
  subject_id: string | null;
  subject_code: string;
  subject_name: string;
  department_id: string | null;
  department_code: string;
  department_name: string;
  level_id: string | null;
  level_name: string;
  term_id: string | null;
  term_name: string;
}

export interface FilterOption {
  id: string;
  label: string;
}

export function MaterialsLibraryClient({
  materials,
  departments,
  levels,
  terms,
}: {
  materials: LibraryMaterialItem[];
  departments: FilterOption[];
  levels: FilterOption[];
  terms: FilterOption[];
}) {
  const [search, setSearch] = useState("");
  const [deptId, setDeptId] = useState("all");
  const [levelId, setLevelId] = useState("all");
  const [termId, setTermId] = useState("all");
  const [subjectCode, setSubjectCode] = useState("all");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cascading subject list based on selected dept/level/term
  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>();
    materials.forEach((m) => {
      if (deptId !== "all" && m.department_id !== deptId) return;
      if (levelId !== "all" && m.level_id !== levelId) return;
      if (termId !== "all" && m.term_id !== termId) return;
      if (m.subject_code && !map.has(m.subject_code)) {
        map.set(m.subject_code, `${m.subject_code} — ${m.subject_name}`);
      }
    });
    return Array.from(map.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [materials, deptId, levelId, termId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (deptId !== "all" && m.department_id !== deptId) return false;
      if (levelId !== "all" && m.level_id !== levelId) return false;
      if (termId !== "all" && m.term_id !== termId) return false;
      if (subjectCode !== "all" && m.subject_code !== subjectCode) return false;
      if (q) {
        const haystack =
          `${m.title} ${m.description || ""} ${m.subject_code} ${m.subject_name} ${m.department_code}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [materials, deptId, levelId, termId, subjectCode, search]);

  const resetFilters = () => {
    setSearch("");
    setDeptId("all");
    setLevelId("all");
    setTermId("all");
    setSubjectCode("all");
  };

  const handleOpenOrDownload = async (
    materialId: string,
    action: "open" | "download"
  ) => {
    setErrorMsg(null);
    setLoadingKey(`${materialId}-${action}`);
    let win: Window | null = null;
    if (action === "open") {
      win = window.open("about:blank", "_blank");
      if (win) win.opener = null;
    }

    try {
      const res = await getStaffMaterialAccessUrl(materialId, action);
      if (!res.success || !res.url) {
        if (win) win.close();
        setErrorMsg(res.error || "Unable to open file.");
        return;
      }
      if (action === "open") {
        if (win) {
          win.location.href = res.url;
        } else {
          window.open(res.url, "_blank", "noopener,noreferrer");
        }
      } else {
        const a = document.createElement("a");
        a.href = res.url;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      if (win) win.close();
      setErrorMsg("Network error while opening file.");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-400">
                <Presentation className="h-3 w-3" />
                Classroom Teaching Vault
              </span>
              <span className="text-xs text-slate-400">
                All Departments • All Levels &amp; Terms
              </span>
            </div>
            <h1 className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl">
              Academic Materials Library
            </h1>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-sky-500/50 hover:text-sky-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Admin Console</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        {/* Search & Cascading Filters */}
        <section className="rounded-2xl border border-slate-800 bg-[#0A1020] p-5 shadow-xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by topic, lecture title, subject code (e.g. YE-201), or subject name..."
                className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-500/40 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={deptId}
              onChange={(e) => {
                setDeptId(e.target.value);
                setSubjectCode("all");
              }}
              className="h-10 rounded-xl border border-slate-700/80 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              value={levelId}
              onChange={(e) => {
                setLevelId(e.target.value);
                setSubjectCode("all");
              }}
              className="h-10 rounded-xl border border-slate-700/80 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">All Levels</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>

            <select
              value={termId}
              onChange={(e) => {
                setTermId(e.target.value);
                setSubjectCode("all");
              }}
              className="h-10 rounded-xl border border-slate-700/80 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="h-10 rounded-xl border border-slate-700/80 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">All Subjects ({availableSubjects.length})</option>
              {availableSubjects.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-sky-400" />
              Showing <strong className="text-white">{filtered.length}</strong> of{" "}
              {materials.length} approved materials
            </span>
          </div>
        </section>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Materials Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0A1020] p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-600" />
            <h3 className="mt-3 font-serif text-lg font-bold text-white">
              No Materials Found
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Try clearing your search or selecting different Department / Level / Term filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const isOpening = loadingKey === `${item.id}-open`;
              const isDownloading = loadingKey === `${item.id}-download`;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 shadow-lg transition-all hover:border-sky-500/40"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                        {item.department_code || "GEN"} • {item.level_name} {item.term_name}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
                        <FileText className="h-3 w-3 text-amber-400" />
                        {item.file_type || "FILE"}
                      </span>
                    </div>

                    <h3 className="mt-3 font-serif text-base font-bold text-white line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-amber-400/90">
                      {item.subject_code} — {item.subject_name}
                    </p>

                    {item.description && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-800/80 pt-3.5">
                    <button
                      type="button"
                      disabled={isOpening || isDownloading}
                      onClick={() => handleOpenOrDownload(item.id, "open")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:from-sky-400 hover:to-sky-500 disabled:opacity-60 cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{isOpening ? "Opening..." : "Open in Browser"}</span>
                    </button>
                    <button
                      type="button"
                      title="Download offline copy"
                      disabled={isOpening || isDownloading}
                      onClick={() => handleOpenOrDownload(item.id, "download")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-sky-500/40 hover:text-sky-300 disabled:opacity-60 cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}