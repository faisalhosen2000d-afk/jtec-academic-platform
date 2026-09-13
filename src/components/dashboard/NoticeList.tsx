"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const NOTICES_PER_PAGE = 5;

export default function NoticeList({
  children,
  categories,
}: {
  children: ReactNode;
  categories: { id: string; name: string }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

  return (
    <div ref={containerRef} className="mt-4">
      <div className="flex w-full items-center gap-4 px-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notices..."
          aria-label="Search notices"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />


        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter notices by category"
          className="w-64 shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 h-[560px] overflow-y-auto rounded-lg border border-border">
        {children}
      </div>

      {matchCount === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No notices found.
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
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
                className={`rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted ${
                  currentPage === page ? "bg-muted" : ""
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
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}







