"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  HardDrive,
  Search,
  User,
} from "lucide-react";
import DeleteApprovedMaterialButton from "./DeleteApprovedMaterialButton";

export type ApprovedMaterialRow = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  file_type: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
  created_at: string;
  subjectLabel: string;
  uploaderName: string;
};

const PAGE_SIZE = 15;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileTypeBadgeCls(fileType: string): string {
  const ft = fileType.toLowerCase();
  if (ft.includes("pdf")) {
    return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  }
  if (ft.includes("doc") || ft.includes("word")) {
    return "border-sky-500/40 bg-sky-500/15 text-sky-300";
  }
  if (ft.includes("ppt") || ft.includes("presentation")) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  if (ft.includes("xls") || ft.includes("sheet") || ft.includes("csv")) {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
}

function getShortFileType(fileType: string): string {
  const ft = fileType.toLowerCase();
  if (ft.includes("pdf")) return "PDF";
  if (ft.includes("word") || ft.includes("doc")) return "DOCX";
  if (ft.includes("presentation") || ft.includes("ppt")) return "PPTX";
  if (ft.includes("sheet") || ft.includes("excel") || ft.includes("xls")) {
    return "XLSX";
  }
  if (
    ft.includes("image") ||
    ft.includes("png") ||
    ft.includes("jpg") ||
    ft.includes("jpeg")
  ) {
    return "IMG";
  }
  const slash = fileType.split("/").pop() ?? fileType;
  return slash.slice(0, 8).toUpperCase();
}

export default function ApprovedMaterialsClient({
  materials,
}: {
  materials: ApprovedMaterialRow[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const fileTypes = useMemo(() => {
    const set = new Set<string>();
    for (const m of materials) {
      set.add(getShortFileType(m.file_type));
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [materials]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      const shortType = getShortFileType(m.file_type);
      if (typeFilter !== "ALL" && shortType !== typeFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        (m.topic ?? "").toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q) ||
        m.subjectLabel.toLowerCase().includes(q) ||
        m.uploaderName.toLowerCase().includes(q)
      );
    });
  }, [materials, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
      {/* Header + Search + Type Filters */}
      <div className="space-y-4 border-b border-slate-800/80 px-6 py-5">
        <div>
          <h2 className="font-serif text-lg font-bold text-white">
            Approved Materials Library
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Showing {filtered.length} of {materials.length} approved{" "}
            {materials.length === 1 ? "material" : "materials"}. Only Super
            Admin can manage deletion of these materials.
          </p>
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
              placeholder="Search title, topic, subject, or uploader..."
              className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-3.5 text-xs text-white placeholder:text-slate-500 transition-all focus:border-emerald-400/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {fileTypes.map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => {
                  setTypeFilter(ft);
                  setPage(1);
                }}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                  typeFilter === ft
                    ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "border-slate-800 bg-[#060A12] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Materials List */}
      {paginated.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-400">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-base font-bold text-white">
            {materials.length === 0
              ? "No approved materials yet"
              : "No matching materials found"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {materials.length === 0
              ? "Approved study materials will appear here once reviewed."
              : "Try adjusting your search query or file type filter."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {paginated.map((material) => {
            const shortType = getShortFileType(material.file_type);
            return (
              <div
                key={material.id}
                className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${getFileTypeBadgeCls(material.file_type)}`}
                    >
                      {shortType}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {material.title}
                    </h3>
                    {material.topic ? (
                      <span className="rounded-full border border-slate-700/80 bg-slate-900 px-2.5 py-0.5 text-[11px] text-slate-300">
                        {material.topic}
                      </span>
                    ) : null}
                  </div>

                  {material.description ? (
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {material.description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5 text-sky-300">
                      <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                      {material.subjectLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      {material.uploaderName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                      {formatFileSize(material.file_size_bytes)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      {material.views_count} views
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      {material.downloads_count} downloads
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      {new Date(material.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end">
                  <DeleteApprovedMaterialButton
                    materialId={material.id}
                    title={material.title}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
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
  );
}