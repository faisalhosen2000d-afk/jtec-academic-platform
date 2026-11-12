"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search, Filter, Trash2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTICES_PER_PAGE = 10;

function ListFilterDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
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

  const currentLabel = options.find((o) => o.value === value)?.label || "All Categories";

  return (
    <div ref={ref} className="relative min-w-[175px]">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all cursor-pointer ${
          open
            ? "border-cyan-400/80 bg-slate-900 text-white ring-2 ring-cyan-500/20"
            : "border-cyan-500/25 bg-gradient-to-r from-slate-950 via-cyan-950/25 to-slate-950 text-slate-200 hover:border-cyan-400/50"
        }`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-cyan-400" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[190px] max-h-56 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1224]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  active ? "bg-cyan-500/15 font-semibold text-cyan-300" : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NoticeList({
  children,
  categories,
  canDelete = false,
}: {
  children: ReactNode;
  categories: { id: string; name: string }[];
  canDelete?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const normalizedSearch = search.toLowerCase().replace(/\s+/g, "");
    const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-notice-search]"));

    const matchingRows = rows.filter((row) => {
      const searchableText = (row.dataset.noticeSearch ?? "").toLowerCase().replace(/\s+/g, "");
      const matchesSearch = normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);
      const matchesCategory = category === "all" || row.dataset.noticeCategory === category;
      return matchesSearch && matchesCategory;
    });

    const calculatedTotalPages = Math.max(1, Math.ceil(matchingRows.length / NOTICES_PER_PAGE));
    setMatchCount(matchingRows.length);
    setTotalPages(calculatedTotalPages);

    const safePage = Math.min(currentPage, calculatedTotalPages);
    const startIndex = (safePage - 1) * NOTICES_PER_PAGE;
    const endIndex = startIndex + NOTICES_PER_PAGE;

    rows.forEach((row) => {
      row.hidden = true;
    });

    matchingRows.slice(startIndex, endIndex).forEach((row) => {
      row.hidden = false;
    });
  }, [search, category, currentPage, children]);

  const goToPage = (page: number) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(safePage);
  };

  return (
    <div ref={containerRef} className="mt-4">
      {/* Mobile-Optimized Search, Filter & Bulk Delete Header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/20 border-b border-slate-800 rounded-t-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notices by title, content..."
              aria-label="Search notices"
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-input bg-slate-950/90 text-slate-100 border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
            <ListFilterDropdown value={category} onChange={setCategory} options={[{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>
        </div>

        
      </div>

      <div className="space-y-3 p-4">
        {children}
      </div>

      {matchCount === 0 ? (
        <div className="p-10 text-center text-sm text-slate-400">
          No matching notices found.
        </div>
      ) : (
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/10 text-xs">
          <span className="text-slate-400">
            Showing {Math.min(matchCount, (currentPage - 1) * NOTICES_PER_PAGE + 1)}–{Math.min(matchCount, currentPage * NOTICES_PER_PAGE)} of {matchCount} notices
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-300">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}