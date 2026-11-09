"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
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

// Reusable Modern Custom Popover Select
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
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3.5 text-left text-xs font-medium text-foreground shadow-xs transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className="truncate">
          {selectedOption ? (
            selectedOption.code ? (
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
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
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
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
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {option.code && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
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
                    <Check className="h-4 w-4 shrink-0 text-primary" />
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

  const previousTermIds = useMemo(() => {
    const currentTermIndex = terms.findIndex(
      (term) => term.id === currentTermId,
    );

    if (currentTermIndex < 0) {
      return [];
    }

    return terms
      .slice(0, currentTermIndex)
      .map((term) => term.id);
  }, [currentTermId, terms]);

  const visibleSubjects = useMemo(() => {
    if (selectedTermId === ALL_PREVIOUS_TERMS) {
      return subjects.filter((subject) =>
        previousTermIds.includes(subject.term_id),
      );
    }

    return subjects.filter((subject) => subject.term_id === selectedTermId);
  }, [previousTermIds, selectedTermId, subjects]);

  const filteredMaterials = useMemo(() => {
    const normalizeText = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, " ");

    const normalizedQuery = normalizeText(searchQuery);
    const queryWords = normalizedQuery
      ? normalizedQuery.split(" ").filter(Boolean)
      : [];

    const visibleSubjectIds = new Set(
      visibleSubjects.map((subject) => subject.id),
    );

    const selectedSubject = visibleSubjects.find(
      (subject) => subject.id === selectedSubjectId,
    );

    const subjectFiltered = materials.filter((material) => {
      if (!visibleSubjectIds.has(material.subject_id)) {
        return false;
      }

      return (
        selectedSubjectId === "all" ||
        !selectedSubject ||
        material.subject_id === selectedSubject.id
      );
    });

    if (!normalizedQuery) {
      return subjectFiltered;
    }

    const containsAllWords = (value: string) =>
      queryWords.every((word) => value.includes(word));

    return subjectFiltered
      .map((material) => {
        const title = normalizeText(material.title);
        const topic = normalizeText(material.topic ?? "");
        const description = normalizeText(material.description ?? "");
        const subjectCode = normalizeText(
          material.subject?.subject_code ?? "",
        );
        const subjectName = normalizeText(
          material.subject?.subject_name ?? "",
        );

        let score = 0;

        if (title === normalizedQuery) {
          score = 100;
        } else if (title.includes(normalizedQuery)) {
          score = 90;
        } else if (containsAllWords(title)) {
          score = 80;
        } else if (topic === normalizedQuery) {
          score = 70;
        } else if (topic.includes(normalizedQuery)) {
          score = 60;
        } else if (containsAllWords(topic)) {
          score = 55;
        } else if (containsAllWords(description)) {
          score = 40;
        } else if (
          subjectCode.includes(normalizedQuery) ||
          subjectName.includes(normalizedQuery)
        ) {
          score = 30;
        }

        return { material, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          new Date(b.material.created_at).getTime() -
          new Date(a.material.created_at).getTime()
        );
      })
      .map((result) => result.material);
  }, [
    materials,
    searchQuery,
    selectedSubjectId,
    visibleSubjects,
  ]);

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    setSelectedSubjectId("all");
  };

  // Build Options for Custom Dropdowns
  const termOptions = useMemo(() => {
    const list = [{ id: currentTermId, label: "Current Term" }];
    terms
      .filter((term) => term.id !== currentTermId)
      .forEach((term) => {
        list.push({ id: term.id, label: term.label });
      });

    if (previousTermIds.length > 0) {
      list.push({ id: ALL_PREVIOUS_TERMS, label: "All Previous Terms" });
    }
    return list;
  }, [currentTermId, terms, previousTermIds]);

  const subjectOptions = useMemo(() => {
    return [
      { id: "all", label: "All Subjects", name: "All Subjects" },
      ...visibleSubjects.map((s) => ({
        id: s.id,
        label: `${s.subject_code} - ${s.subject_name}`,
        code: s.subject_code,
        name: s.subject_name,
      })),
    ];
  }, [visibleSubjects]);

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Academic Term Custom Dropdown */}
        <CustomDropdown
          label="Academic Term"
          value={selectedTermId}
          onChange={handleTermChange}
          options={termOptions}
        />

        {/* Search Materials with Search Icon */}
        <div>
          <label
            htmlFor="material-search"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Search Materials
          </label>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              id="material-search"
              type="search"
              placeholder="Search by title, topic, description..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/60 shadow-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Subject Custom Dropdown with Subject Code Chips */}
        <CustomDropdown
          label="Subject"
          value={selectedSubjectId}
          onChange={setSelectedSubjectId}
          options={subjectOptions}
          placeholder="All Subjects"
        />
      </div>

      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="text-xs font-medium text-muted-foreground">
          {filteredMaterials.length}{" "}
          {filteredMaterials.length === 1 ? "material" : "materials"} found
        </p>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              searchQuery={searchQuery}
              initialBookmarked={bookmarkedMaterialIds.includes(material.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-semibold text-foreground">
            No materials found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query, term, or subject filter.
          </p>
        </div>
      )}
    </section>
  );
}