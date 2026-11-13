"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Subject = {
  id: string;
  subject_code: string;
  subject_name: string;
  level_id: string;
  term_id: string;
  level_name: string;
  term_name: string;
};

type TermOption = {
  id: string;
  label: string;
};

type UploadFormProps = {
  subjects: Subject[];
  terms: TermOption[];
  currentTermId?: string;
  maxUploadSizeMb?: number;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadForm({
  subjects,
  terms,
  currentTermId,
  maxUploadSizeMb = 100,
}: UploadFormProps) {
  const [selectedTermFilter, setSelectedTermFilter] = useState(
    currentTermId || "all",
  );
  const [termDropdownOpen, setTermDropdownOpen] = useState(false);

  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const termContainerRef = useRef<HTMLDivElement>(null);
  const subjectContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        termContainerRef.current &&
        !termContainerRef.current.contains(event.target as Node)
      ) {
        setTermDropdownOpen(false);
      }
      if (
        subjectContainerRef.current &&
        !subjectContainerRef.current.contains(event.target as Node)
      ) {
        setSubjectDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTermDropdownOpen(false);
        setSubjectDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const termOptionsList = useMemo(
    () => [
      {
        id: "all",
        label: `All Accessible Terms (${subjects.length} subjects)`,
      },
      ...terms.map((term) => {
        const count = subjects.filter((s) => s.term_id === term.id).length;
        const isCurrent = term.id === currentTermId;
        return {
          id: term.id,
          label: `${term.label}${isCurrent ? " (Current)" : ""} (${count})`,
        };
      }),
    ],
    [currentTermId, subjects, terms],
  );

  const selectedTermLabel =
    termOptionsList.find((t) => t.id === selectedTermFilter)?.label ??
    "Select Term";

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      if (selectedTermFilter !== "all" && subject.term_id !== selectedTermFilter) {
        return false;
      }

      const query = subjectSearch.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return (
        subject.subject_code.toLowerCase().includes(query) ||
        subject.subject_name.toLowerCase().includes(query)
      );
    });
  }, [subjects, selectedTermFilter, subjectSearch]);

  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );

  const handleTermChange = (termId: string) => {
    setSelectedTermFilter(termId);
    setTermDropdownOpen(false);
    setSelectedSubjectId("");
    setSubjectSearch("");
    setSubjectDropdownOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!selectedSubjectId) {
      setError("Please select a subject.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a material title.");
      return;
    }

    if (!file) {
      setError("Please select a file.");
      return;
    }

    if (file.size <= 0) {
      setError("The selected file is empty.");
      return;
    }

    if (file.size > maxUploadSizeMb * 1024 * 1024) {
      setError(`File size cannot exceed ${maxUploadSizeMb} MB.`);
      return;
    }

    try {
      setSubmitting(true);

      const metadata = {
        subject_id: selectedSubjectId,
        title: title.trim(),
        description: description.trim(),
        topic: topic.trim(),
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
      };

      const prepareResponse = await fetch("/api/materials/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "prepare",
          ...metadata,
        }),
      });

      const prepareData = await prepareResponse.json();

      if (!prepareResponse.ok) {
        throw new Error(
          prepareData?.error || "Upload preparation failed.",
        );
      }

      const supabase = createClient();

      const { error: storageError } = await supabase.storage
        .from("academic-materials")
        .upload(prepareData.filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (storageError) {
        throw new Error(
          storageError.message || "The file could not be uploaded to storage.",
        );
      }

      const finalizeResponse = await fetch("/api/materials/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "finalize",
          ...metadata,
          material_id: prepareData.materialId,
          file_path: prepareData.filePath,
        }),
      });

      const finalizeData = await finalizeResponse.json();

      if (!finalizeResponse.ok) {
        throw new Error(
          finalizeData?.error || "Upload finalization failed.",
        );
      }

      setMessage("Material uploaded successfully and submitted for admin approval!");
      setSelectedSubjectId("");
      setSubjectSearch("");
      setTitle("");
      setDescription("");
      setTopic("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      console.error("[upload_form_error]", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "An unexpected error occurred during upload. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm font-medium text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Academic Term (Compact Dropdown) */}
      <div ref={termContainerRef} className="relative">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Academic Term <span className="text-rose-400">*</span>
        </label>
        <button
          type="button"
          onClick={() => setTermDropdownOpen((prev) => !prev)}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 text-left text-xs sm:text-sm text-slate-100 transition hover:border-cyan-500/40 focus:border-cyan-500/60 focus:outline-none"
        >
          <span className="truncate">{selectedTermLabel}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              termDropdownOpen ? "rotate-180 text-cyan-300" : ""
            }`}
          />
        </button>

        {termDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
            <div className="space-y-0.5">
              {termOptionsList.map((opt) => {
                const active = opt.id === selectedTermFilter;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleTermChange(opt.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "text-slate-300 hover:bg-[#0E172A] hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Full-Width Non-Truncating Subject Selector */}
      <div ref={subjectContainerRef} className="relative">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label
            htmlFor="subject-search"
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Subject <span className="text-rose-400">*</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {filteredSubjects.length} available
          </span>
        </div>

        {selectedSubject ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-cyan-500/40 bg-[#0E172A] px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                  {selectedSubject.subject_code}
                </span>
                {selectedSubject.subject_name.toLowerCase().includes("practical") && (
                  <span className="rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    Practical
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  {selectedSubject.level_name} - {selectedSubject.term_name}
                </span>
              </div>
              <p className="mt-1 whitespace-normal text-xs sm:text-sm font-medium leading-snug text-white">
                {selectedSubject.subject_name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId("");
                setSubjectSearch("");
                setSubjectDropdownOpen(true);
              }}
              className="shrink-0 rounded-lg border border-slate-700 bg-[#0A1020] p-1.5 text-slate-400 transition hover:border-slate-600 hover:text-white"
              title="Change subject"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="subject-search"
              type="text"
              value={subjectSearch}
              onChange={(event) => {
                setSubjectSearch(event.target.value);
                setSubjectDropdownOpen(true);
              }}
              onFocus={() => setSubjectDropdownOpen(true)}
              placeholder="Click to choose subject or type code/name..."
              className="h-10 w-full rounded-xl border border-slate-800 bg-[#0E172A] pl-10 pr-9 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15"
              autoComplete="off"
            />
            <ChevronDown
              className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${
                subjectDropdownOpen ? "rotate-180 text-cyan-300" : ""
              }`}
            />

            {subjectDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
                {filteredSubjects.length > 0 ? (
                  <div className="space-y-1">
                    {filteredSubjects.map((subject) => {
                      const isPractical = subject.subject_name
                        .toLowerCase()
                        .includes("practical");
                      return (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubjectId(subject.id);
                            setSubjectSearch("");
                            setSubjectDropdownOpen(false);
                          }}
                          className="block w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-slate-800 hover:bg-[#0E172A] focus:bg-[#0E172A] focus:outline-none"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-300">
                                {subject.subject_code}
                              </span>
                              {isPractical && (
                                <span className="rounded border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                                  Practical
                                </span>
                              )}
                            </div>
                            <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10.5px] font-medium text-slate-300">
                              {subject.level_name} - {subject.term_name}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-normal text-xs font-medium leading-snug text-slate-100">
                            {subject.subject_name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">
                    No subjects found for this term.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact 2-Col Title & Topic */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="material-title"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Material Title <span className="text-rose-400">*</span>
          </label>
          <input
            id="material-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3 Lecture Notes"
            className="h-10 w-full rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15"
          />
        </div>

        <div>
          <label
            htmlFor="material-topic"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Topic / Chapter <span className="text-slate-500">(Optional)</span>
          </label>
          <input
            id="material-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Midterm Review, Lab 04"
            className="h-10 w-full rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15"
          />
        </div>
      </div>

      {/* Compact Description */}
      <div>
        <label
          htmlFor="material-description"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
        >
          Description <span className="text-slate-500">(Optional)</span>
        </label>
        <textarea
          id="material-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe what this material covers..."
          className="w-full rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15"
        />
      </div>

      {/* Compact Drag & Drop File Attachment */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Attachment File <span className="text-rose-400">*</span>
        </label>
        <input
          ref={fileInputRef}
          id="material-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-[#0A1020] text-emerald-400">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm font-semibold text-white">
                  {file.name}
                </p>
                <p className="text-[11px] text-emerald-300">
                  {formatBytes(file.size)} · Ready to upload
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="shrink-0 rounded-lg border border-slate-700 bg-[#0A1020] p-1.5 text-slate-400 transition hover:text-rose-300"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={`flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between ${
              isDragging
                ? "border-cyan-400 bg-cyan-500/10"
                : "border-cyan-500/35 bg-[#0E172A]/80 hover:border-cyan-400/60 hover:bg-[#0E172A]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-100">
                  Click to choose or drag &amp; drop file
                </p>
                <p className="text-[11px] text-slate-400">
                  PDF, DOCX, PPTX, XLSX, Images · Max {maxUploadSizeMb} MB
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0A1020] px-3 py-1.5 text-xs font-semibold text-slate-200">
              Choose File
            </span>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.3)] transition hover:bg-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Upload Material
            </>
          )}
        </button>
      </div>
    </form>
  );
}