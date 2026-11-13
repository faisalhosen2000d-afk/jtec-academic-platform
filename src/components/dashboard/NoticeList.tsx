"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

const NOTICES_PER_PAGE = 5;

export default function NoticeList({
  children,
  categories,
}: {
  children: ReactNode;
  categories: { id: string; name: string }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [catOpen, setCatOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setCatOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const normalizedSearch = search
      .toLowerCase()
      .replace(/\s+/g, "");

    const rows = Array.from(
      container.querySelectorAll<HTMLElement>("[data-notice-search]")
    );

    const matchingRows = rows.filter((row) => {
      const searchableText = (row.dataset.noticeSearch ?? "")
        .toLowerCase()
        .replace(/\s+/g, "");

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      const matchesCategory =
        category === "all" ||
        row.dataset.noticeCategory === category;

      return matchesSearch && matchesCategory;
    });

    const calculatedTotalPages = Math.max(
      1,
      Math.ceil(matchingRows.length / NOTICES_PER_PAGE)
    );

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

  const selectedCategoryName =
    category === "all"
      ? "All Categories"
      : categories.find((c) => c.id === category)?.name ?? "All Categories";

  return (
    <div ref={containerRef} className="mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notices..."
            aria-label="Search notices"
            className="h-10 w-full rounded-xl border border-slate-800 bg-[#0E172A] pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15"
          />
        </div>

        {/* Custom Dark-Navy Category Dropdown */}
        <div ref={dropdownRef} className="relative w-full shrink-0 sm:w-64">
          <button
            type="button"
            onClick={() => setCatOpen((prev) => !prev)}
            aria-label="Filter notices by category"
            aria-expanded={catOpen}
            className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 text-left text-sm text-slate-100 transition hover:border-cyan-500/45 focus:border-cyan-500/60 focus:outline-none"
          >
            <span className="truncate">{selectedCategoryName}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
                catOpen ? "rotate-180 text-cyan-300" : ""
              }`}
            />
          </button>

          <div
            aria-hidden={!catOpen}
            className={`absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.85)] transition-all duration-150 origin-top ${
              catOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1.5 scale-95 opacity-0"
            }`}
          >
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setCategory("all");
                  setCatOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                  category === "all"
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-slate-300 hover:bg-[#0E172A] hover:text-white"
                }`}
              >
                <span>All Categories</span>
                {category === "all" && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>

              {categories.map((item) => {
                const active = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCategory(item.id);
                      setCatOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "text-slate-300 hover:bg-[#0E172A] hover:text-white"
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 max-h-[460px] overflow-y-auto rounded-xl border border-slate-800/90 bg-[#060A12]/60">
        {children}
      </div>

      {matchCount === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-800 bg-[#0E172A]/50 p-6 text-center text-sm text-slate-400">
          No notices found.
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-45"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                  currentPage === page
                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-800 bg-[#0E172A] text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-45"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}