"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowUpDown, Bookmark, ChevronDown, Check, Search } from "lucide-react";
import MaterialCard from "@/components/student/MaterialCard";

type MaterialSearchItem = {
  id: string;
  subject_id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  file_type: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
  created_at: string;
  uploader: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    telegram: string | null;
    department_name?: string | null;
  } | null;
  subject: {
    id: string;
    subject_code: string;
    subject_name: string;
    level_id: string;
    term_id: string;
  } | null;
};

type MaterialSearchSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  level_id: string;
  term_id: string;
};

type MaterialTermOption = {
  id: string;
  label: string;
};

type MaterialsSearchProps = {
  subjects: MaterialSearchSubject[];
  materials: MaterialSearchItem[];
  bookmarkedMaterialIds: string[];
  terms: MaterialTermOption[];
  currentTermId: string;
};

const ALL_PREVIOUS_TERMS = "all-previous";

function getFileCategory(fileType: string, title?: string): string {
  const ft = (fileType || "").toLowerCase();
  const ext = title && title.includes(".") ? title.split(".").pop()?.toLowerCase() : "";
  if (ft.includes("pdf") || ext === "pdf") return "PDF";
  if (ft.includes("word") || ft.includes("officedocument.word") || ["doc", "docx"].includes(ext || "")) return "WORD";
  if (ft.includes("presentation") || ft.includes("powerpoint") || ["ppt", "pptx"].includes(ext || "")) return "SLIDES";
  if (ft.includes("sheet") || ft.includes("excel") || ["xls", "xlsx", "csv"].includes(ext || "")) return "EXCEL";
  if (ft.includes("image") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) return "IMAGE";
  return "OTHER";
}

function CustomDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: Array<{
    id: string;
    label: string;
    code?: string;
    name?: string;
  }>;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border bg-[#060A12] px-3.5 text-left text-xs font-semibold text-white transition-all ${
          isOpen
            ? "border-emerald-400/80 ring-2 ring-emerald-500/20"
            : "border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <span className="truncate">
          {selectedOption ? (
            selectedOption.code ? (
              <span className="flex items-center gap-2">
                <span className="rounded-md border border-cyan-500/35 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                  {selectedOption.code}
                </span>
                <span className="truncate">{selectedOption.name}</span>
              </span>
            ) : (
              selectedOption.label
            )
          ) : (
            placeholder || "Select option..."
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-300" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-emerald-500/35 bg-[#0A1020] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-emerald-500/20 font-semibold text-emerald-300"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {option.code && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          isSelected
                            ? "bg-emerald-500/25 text-emerald-200"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {option.code}
                      </span>
                    )}
                    <span className="truncate">
                      {option.name || option.label}
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaterialsSearch({
  subjects,
  materials,
  bookmarkedMaterialIds,
  terms,
  currentTermId,
}: MaterialsSearchProps) {
  const [selectedTermId, setSelectedTermId] = useState(currentTermId);
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PDF" | "WORD" | "SLIDES" | "EXCEL">("ALL");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "views" | "downloads">("newest");

  const previousTermIds = useMemo(() => {
    const currentTermIndex = terms.findIndex(
      (term) => term.id === currentTermId,
    );

    if (currentTermIndex < 0) {
      return [];
    }

    return terms.slice(0, currentTermIndex).map((term) => term.id);
  }, [currentTermId, terms]);

  const visibleSubjects = useMemo(() => {
    if (selectedTermId === ALL_PREVIOUS_TERMS) {
      return subjects.filter((subject) =>
        previousTermIds.includes(subject.term_id),
      );
    }
    return subjects.filter((subject) => subject.term_id === selectedTermId);
  }, [subjects, selectedTermId, previousTermIds]);

  const bookmarkedSet = useMemo(
    () => new Set(bookmarkedMaterialIds),
    [bookmarkedMaterialIds],
  );

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = materials.filter((material) => {
      if (selectedTermId === ALL_PREVIOUS_TERMS) {
        if (
          !material.subject ||
          !previousTermIds.includes(material.subject.term_id)
        ) {
          return false;
        }
      } else if (
        !material.subject ||
        material.subject.term_id !== selectedTermId
      ) {
        return false;
      }

      if (
        selectedSubjectId !== "all" &&
        material.subject_id !== selectedSubjectId
      ) {
        return false;
      }

      if (onlyBookmarked && !bookmarkedSet.has(material.id)) {
        return false;
      }

      if (typeFilter !== "ALL") {
        const cat = getFileCategory(material.file_type, material.title);
        if (cat !== typeFilter) return false;
      }

      if (!q) return true;

      return (
        material.title.toLowerCase().includes(q) ||
        (material.topic?.toLowerCase().includes(q) ?? false) ||
        (material.description?.toLowerCase().includes(q) ?? false) ||
        (material.subject?.subject_code.toLowerCase().includes(q) ?? false) ||
        (material.subject?.subject_name.toLowerCase().includes(q) ?? false)
      );
    });

    return [...matched].sort((a, b) => {
      if (q) {
        const aTitle = a.title.toLowerCase().includes(q) ? 2 : 0;
        const bTitle = b.title.toLowerCase().includes(q) ? 2 : 0;
        const aCode = a.subject?.subject_code.toLowerCase().includes(q) ? 1 : 0;
        const bCode = b.subject?.subject_code.toLowerCase().includes(q) ? 1 : 0;
        const diff = bTitle + bCode - (aTitle + aCode);
        if (diff !== 0) return diff;
      }

      if (sortBy === "views") {
        return (b.views_count ?? 0) - (a.views_count ?? 0);
      }
      if (sortBy === "downloads") {
        return (b.downloads_count ?? 0) - (a.downloads_count ?? 0);
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [
    materials,
    selectedTermId,
    selectedSubjectId,
    searchQuery,
    previousTermIds,
    onlyBookmarked,
    bookmarkedSet,
    typeFilter,
    sortBy,
  ]);

  const termOptions = useMemo(() => {
    return [
      ...terms.map((t) => ({
        id: t.id,
        label: t.id === currentTermId ? `${t.label} (Current)` : t.label,
      })),
      { id: ALL_PREVIOUS_TERMS, label: "All Previous Terms" },
    ];
  }, [terms, currentTermId]);

  const subjectOptions = useMemo(() => {
    return [
      { id: "all", label: "All Subjects" },
      ...visibleSubjects.map((s) => ({
        id: s.id,
        label: `${s.subject_code} - ${s.subject_name}`,
        code: s.subject_code,
        name: s.subject_name,
      })),
    ];
  }, [visibleSubjects]);

  return (
    <div className="space-y-6">
      {/* Search & Filters Panel */}
      <section className="space-y-4 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 shadow-xl transition-all duration-200 hover:border-emerald-500/35">
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Search Materials
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, topic, or subject code..."
                className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-4 text-xs font-medium text-white placeholder:text-slate-500 transition-all focus:border-emerald-400/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <CustomDropdown
              label="Academic Term"
              value={selectedTermId}
              onChange={(val) => {
                setSelectedTermId(val);
                setSelectedSubjectId("all");
              }}
              options={termOptions}
            />
          </div>

          <div className="md:col-span-3">
            <CustomDropdown
              label="Subject"
              value={selectedSubjectId}
              onChange={setSelectedSubjectId}
              options={subjectOptions}
            />
          </div>
        </div>

        {/* File-Type Filter Pills & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "ALL", label: "All" },
                { key: "PDF", label: "PDF" },
                { key: "WORD", label: "DOCX" },
                { key: "SLIDES", label: "PPTX" },
                { key: "EXCEL", label: "XLSX" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTypeFilter(item.key)}
                className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  typeFilter === item.key
                    ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "border-slate-800 bg-[#060A12] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setOnlyBookmarked((b) => !b)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                onlyBookmarked
                  ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                  : "border-slate-800 bg-[#060A12] text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <Bookmark className="h-3 w-3" />
              <span>Bookmarked</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <ArrowUpDown className="h-3 w-3 text-emerald-400" />
              Sort:
            </span>
            {(
              [
                { key: "newest", label: "Newest" },
                { key: "views", label: "Most Viewed" },
                { key: "downloads", label: "Most Downloaded" },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSortBy(s.key)}
                className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  sortBy === s.key
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-800 bg-[#060A12] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing{" "}
          <span className="font-semibold text-emerald-300">
            {filteredMaterials.length}
          </span>{" "}
          approved {filteredMaterials.length === 1 ? "material" : "materials"}
        </div>
      </section>

      {/* Results Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/60 p-12 text-center">
          <p className="font-serif text-base font-bold text-white">
            No materials match your filters
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Try clearing your search query or switching to another term,
            subject, or file type.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              searchQuery={searchQuery}
              initialBookmarked={bookmarkedSet.has(material.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}