"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
};

export default function UploadForm({
  subjects,
  terms,
  currentTermId,
}: UploadFormProps) {
  const [selectedTermFilter, setSelectedTermFilter] = useState(
    currentTermId || "all",
  );
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const subjectContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        subjectContainerRef.current &&
        !subjectContainerRef.current.contains(event.target as Node)
      ) {
        setSubjectDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSubjectDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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

    if (file.size > 100 * 1024 * 1024) {
      setError("File size cannot exceed 100 MB.");
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

      setMessage("Material uploaded successfully and submitted for approval!");
      setSelectedSubjectId("");
      setSubjectSearch("");
      setTitle("");
      setDescription("");
      setTopic("");
      setFile(null);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Academic Term Filter */}
      <div className="space-y-2">
        <label
          htmlFor="term-filter"
          className="text-sm font-medium text-foreground"
        >
          Select Academic Term / Level (Filter Subjects)
        </label>
        <select
          id="term-filter"
          value={selectedTermFilter}
          onChange={(e) => handleTermChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Accessible Terms ({subjects.length} subjects)</option>
          {terms.map((term) => {
            const count = subjects.filter((s) => s.term_id === term.id).length;
            const isCurrent = term.id === currentTermId;
            return (
              <option key={term.id} value={term.id}>
                {term.label} {isCurrent ? "(Current Term)" : ""} ({count} subjects)
              </option>
            );
          })}
        </select>
        <p className="text-xs text-muted-foreground">
          Choose a term to narrow down the subject list, or select &quot;All Accessible Terms&quot;.
        </p>
      </div>

      {/* Subject Selection */}
      <div ref={subjectContainerRef} className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="subject-search"
            className="text-sm font-medium text-foreground"
          >
            Subject <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-muted-foreground">
            {filteredSubjects.length} subjects available
          </span>
        </div>

        <div className="relative">
          <input
            id="subject-search"
            type="text"
            value={
              selectedSubject
                ? `${selectedSubject.subject_code} - ${selectedSubject.subject_name}`
                : subjectSearch
            }
            onChange={(event) => {
              setSelectedSubjectId("");
              setSubjectSearch(event.target.value);
              setSubjectDropdownOpen(true);
            }}
            onFocus={() => setSubjectDropdownOpen(true)}
            placeholder="Click to view subjects or type code/name..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoComplete="off"
          />

          {subjectDropdownOpen && !selectedSubjectId && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(subject.id);
                      setSubjectSearch("");
                      setSubjectDropdownOpen(false);
                    }}
                    className="block w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">
                        {subject.subject_code}
                      </p>
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {subject.level_name} - {subject.term_name}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-foreground">
                      {subject.subject_name}
                    </p>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No subjects found for this term.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="material-title"
          className="text-sm font-medium text-foreground"
        >
          Material Title
        </label>
        <input
          id="material-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 3 Lecture Notes, Term Final Question Bank"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="material-topic"
          className="text-sm font-medium text-foreground"
        >
          Topic / Chapter (Optional)
        </label>
        <input
          id="material-topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Differential Equations, Midterm Review"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="material-description"
          className="text-sm font-medium text-foreground"
        >
          Description (Optional)
        </label>
        <textarea
          id="material-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe what this material covers..."
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="material-file"
          className="text-sm font-medium text-foreground"
        >
          File Attachment
        </label>
        <input
          id="material-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 focus:outline-none"
        />
        <p className="text-xs text-muted-foreground">
          Maximum allowed file size: 100 MB.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
      >
        {submitting ? "Uploading..." : "Upload Material"}
      </button>
    </form>
  );
}