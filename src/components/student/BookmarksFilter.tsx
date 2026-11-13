"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown, Search } from "lucide-react";
import MaterialCard from "@/components/student/MaterialCard";

type BookmarkFilterSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  level_id: string;
  term_id: string;
};

type BookmarkTermOption = {
  id: string;
  label: string;
};

type BookmarkFilterMaterial = {
  id: string;
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

type BookmarksFilterProps = {
  subjects: BookmarkFilterSubject[];
  materials: BookmarkFilterMaterial[];
  terms: BookmarkTermOption[];
  currentTermId: string;
};

type DropdownOption = {
  id: string;
  label: string;
};

const ALL_PREVIOUS_TERMS = "all-previous";
const FILE_TYPES = ["all", "PDF", "DOCX", "PPTX", "XLSX"] as const;
type SortOption = "recent" | "views" | "downloads";

function DarkDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectedLabel =
    options.find((opt) => opt.id === value)?.label ?? options[0]?.label ?? "";

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 text-left text-sm text-slate-200 transition hover:border-amber-500/40 focus:border-amber-500/60 focus:outline-none"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180 text-amber-300" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-amber-500/35 bg-[#0A1020] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                    isSelected
                      ? "bg-amber-500/15 text-amber-300"
                      : "text-slate-300 hover:bg-[#0E172A] hover:text-white"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookmarksFilter({
  subjects,
  materials,
  terms,
  currentTermId,
}: BookmarksFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTermId, setSelectedTermId] = useState(currentTermId);
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [selectedFileType, setSelectedFileType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const previousTermIds = useMemo(() => {
    const currentTermIndex = terms.findIndex(
      (term) => term.id === currentTermId,
    );

    if (currentTermIndex < 0) {
      return [];
    }

    return terms.slice(0, currentTermIndex).map((term) => term.id);
  }, [currentTermId, terms]);

  const termDropdownOptions = useMemo(() => {
    const opts: DropdownOption[] = terms.map((term) => ({
      id: term.id,
      label:
        term.id === currentTermId
          ? `${term.label} (Current)`
          : term.label,
    }));

    if (previousTermIds.length > 0) {
      opts.push({
        id: ALL_PREVIOUS_TERMS,
        label: "All Previous Terms",
      });
    }

    return opts;
  }, [currentTermId, previousTermIds.length, terms]);

  const visibleSubjects = useMemo(() => {
    if (selectedTermId === ALL_PREVIOUS_TERMS) {
      return subjects.filter((subject) =>
        previousTermIds.includes(subject.term_id),
      );
    }

    return subjects.filter((subject) => subject.term_id === selectedTermId);
  }, [previousTermIds, selectedTermId, subjects]);

  const subjectDropdownOptions = useMemo<DropdownOption[]>(
    () => [
      { id: "all", label: "All Subjects" },
      ...visibleSubjects.map((s) => ({
        id: s.id,
        label: `${s.subject_code} - ${s.subject_name}`,
      })),
    ],
    [visibleSubjects],
  );

  const filteredMaterials = useMemo(() => {
    const visibleSubjectIds = new Set(
      visibleSubjects.map((subject) => subject.id),
    );
    const q = searchQuery.trim().toLowerCase();

    const matched = materials.filter((material) => {
      const materialSubject = material.subject;

      if (!materialSubject || !visibleSubjectIds.has(materialSubject.id)) {
        return false;
      }

      if (
        selectedSubjectId !== "all" &&
        materialSubject.id !== selectedSubjectId
      ) {
        return false;
      }

      if (selectedFileType !== "all") {
        const ft = material.file_type.toUpperCase();
        if (selectedFileType === "DOCX") {
          if (!ft.includes("DOC")) return false;
        } else if (selectedFileType === "PPTX") {
          if (!ft.includes("PPT")) return false;
        } else if (selectedFileType === "XLSX") {
          if (!ft.includes("XLS")) return false;
        } else if (ft !== selectedFileType) {
          return false;
        }
      }

      if (q) {
        const haystack = [
          material.title,
          material.topic ?? "",
          material.description ?? "",
          materialSubject.subject_code,
          materialSubject.subject_name,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    if (sortBy === "views") {
      return [...matched].sort((a, b) => b.views_count - a.views_count);
    }
    if (sortBy === "downloads") {
      return [...matched].sort((a, b) => b.downloads_count - a.downloads_count);
    }

    return matched;
  }, [
    materials,
    searchQuery,
    selectedFileType,
    selectedSubjectId,
    sortBy,
    visibleSubjects,
  ]);

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    setSelectedSubjectId("all");
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters Panel */}
      <section className="dash-stagger-2 space-y-4 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 shadow-xl transition-all duration-200 hover:border-amber-500/35">
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Search Bookmarks
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved title, topic, or subject code..."
                className="h-11 w-full rounded-xl border border-slate-800 bg-[#0E172A] pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <DarkDropdown
              label="Academic Term"
              value={selectedTermId}
              options={termDropdownOptions}
              onChange={handleTermChange}
            />
          </div>

          <div className="md:col-span-3">
            <DarkDropdown
              label="Subject"
              value={selectedSubjectId}
              options={subjectDropdownOptions}
              onChange={setSelectedSubjectId}
            />
          </div>
        </div>

        {/* File Type Pills & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {FILE_TYPES.map((ft) => {
              const active = selectedFileType === ft;
              return (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setSelectedFileType(ft)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                      : "border-slate-800 bg-[#0E172A] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {ft === "all" ? "All" : ft}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort:
            </span>
            {(
              [
                { id: "recent", label: "Recently Saved" },
                { id: "views", label: "Most Viewed" },
                { id: "downloads", label: "Most Downloaded" },
              ] as const
            ).map((item) => {
              const active = sortBy === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSortBy(item.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                      : "border-slate-800 bg-[#0E172A] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Showing{" "}
          <span className="font-bold text-amber-300">
            {filteredMaterials.length}
          </span>{" "}
          saved {filteredMaterials.length === 1 ? "material" : "materials"}
        </p>
      </section>

      {/* Bookmarked Material Cards Grid (exact same MaterialCard as /materials) */}
      {filteredMaterials.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((material, index) => (
            <div
              key={material.id}
              style={{
                animation: "dashFadeUp 0.42s ease-out both",
                animationDelay: `${Math.min(index, 11) * 50 + 140}ms`,
              }}
            >
              <MaterialCard
                material={material}
                searchQuery={searchQuery}
                initialBookmarked={true}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/60 px-6 py-12 text-center">
          <h2 className="font-serif text-base font-bold text-white">
            No bookmarks match your filters
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            Try clearing your search query or switching to another term, subject,
            or file type.
          </p>
        </div>
      )}
    </div>
  );
}