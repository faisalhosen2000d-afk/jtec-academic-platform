"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTICES_PER_PAGE = 10;

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
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20 border-b border-border rounded-t-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notices by title, content..."
              aria-label="Search notices"
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter notices by category"
              className="w-full sm:w-56 h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canDelete && (
          <Link href="/admin/notices/bulk-delete" className="shrink-0">
            <Button variant="outline" className="w-full sm:w-auto h-8 px-3 text-xs text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Bulk Delete Notices
            </Button>
          </Link>
        )}
      </div>

      <div className="divide-y divide-border">
        {children}
      </div>

      {matchCount === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No matching notices found.
        </div>
      ) : (
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/10 text-xs">
          <span className="text-muted-foreground">
            Showing {Math.min(matchCount, (currentPage - 1) * NOTICES_PER_PAGE + 1)}–{Math.min(matchCount, currentPage * NOTICES_PER_PAGE)} of {matchCount} notices
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}