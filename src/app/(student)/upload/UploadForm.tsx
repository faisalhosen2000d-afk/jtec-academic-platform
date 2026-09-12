"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Subject = {
  id: string;
  subject_code: string;
  subject_name: string;
};

type UploadFormProps = {
  subjects: Subject[];
};

export default function UploadForm({ subjects }: UploadFormProps) {
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
    const query = subjectSearch.trim().toLowerCase();

    if (!query) {
      return subjects;
    }

    return subjects.filter((subject) => {
      return (
        subject.subject_code.toLowerCase().includes(query) ||
        subject.subject_name.toLowerCase().includes(query)
      );
    });
  }, [subjects, subjectSearch]);

  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );

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
          finalizeData?.error || "Material could not be saved.",
        );
      }

      setMessage(
        finalizeData?.message ||
          "Material submitted successfully. It is now pending review.",
      );

      setSubjectSearch("");
      setSelectedSubjectId("");
      setTitle("");
      setDescription("");
      setTopic("");
      setFile(null);
      setSubjectDropdownOpen(false);

      const fileInput = document.getElementById(
        "material-file",
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
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

      <div ref={subjectContainerRef} className="space-y-2">
        <label
          htmlFor="subject-search"
          className="text-sm font-medium text-foreground"
        >
          Subject
        </label>

        <div className="relative">
          <input
            id="subject-search"
            type="text"
            value={
              selectedSubject
                ? `${selectedSubject.subject_code} — ${selectedSubject.subject_name}`
                : subjectSearch
            }
            onChange={(event) => {
              setSelectedSubjectId("");
              setSubjectSearch(event.target.value);
              setSubjectDropdownOpen(true);
            }}
            onFocus={() => setSubjectDropdownOpen(true)}
            placeholder="Search and select your subject..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
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
                    className="block w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {subject.subject_code}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {subject.subject_name}
                    </p>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No subjects found.
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
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter the title or name of this material..."
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="material-topic"
          className="text-sm font-medium text-foreground"
        >
          Topic
        </label>

        <input
          id="material-topic"
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Enter the main topic or chapter..."
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="material-description"
          className="text-sm font-medium text-foreground"
        >
          Description
        </label>

        <textarea
          id="material-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Briefly describe what this material contains..."
          rows={4}
          className="w-full resize-y rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="material-file"
          className="text-sm font-medium text-foreground"
        >
          File
        </label>

        <input
          id="material-file"
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
          }}
          className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground"
        />

        <p className="text-xs text-muted-foreground">
          Maximum file size: 100 MB. XLS/XLSX files are not allowed.
        </p>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Uploading..." : "Upload Material"}
        </button>
      </div>
    </form>
  );
}
