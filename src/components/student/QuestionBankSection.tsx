"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  Plus,
  X,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  ClipboardList,
  Image as ImageIcon,
  Eye,
  ChevronDown,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildCleanQuestionPdf, compressImageForOcr, convertImagesToSinglePdf } from "@/lib/images-to-pdf";

export type QuestionBankItem = {
  id: string;
  subject_id: string;
  subject_code: string;
  level_id: string;
  term_id: string;
  question_type: "previous_year" | "ct";
  exam_year: number | null;
  ct_number: number | null;
  batch_label: string | null;
  notes: string | null;
  file_size_bytes: number;
  status: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
  is_reference?: boolean;
  is_own_dept?: boolean;
  source_label?: string | null;
  uploader?: {
    full_name: string;
    student_id: string | null;
    avatar_url: string | null;
    email: string | null;
    dept_code: string | null;
  } | null;
};

export type QuestionSubjectOption = {
  id: string;
  subject_code: string;
  subject_name: string;
  level_id: string;
  term_id: string;
};

export type QuestionTermOption = {
  id: string;
  label: string;
};

type QuestionBankSectionProps = {
  mode: "previous_year" | "ct";
  items: QuestionBankItem[];
  takenSlots: Array<{
    subject_code: string;
    level_id: string;
    term_id: string;
    question_type: "previous_year" | "ct";
    exam_year: number | null;
    ct_number: number | null;
    status: string;
  }>;
  subjects: QuestionSubjectOption[];
  terms: QuestionTermOption[];
  currentTermId: string;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type QbDropdownOption = {
  id: string;
  label: string;
  code?: string;
  name?: string;
};

function QbDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: QbDropdownOption[];
  placeholder?: string;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", onOutside);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const selected = options.find((o) => o.id === value);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-[#060A12] px-3.5 text-left text-xs font-semibold text-white transition-all ${
          open
            ? "border-cyan-400/80 ring-2 ring-cyan-500/20"
            : "border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            selected.code ? (
              <span className="flex items-center gap-2">
                <span className="shrink-0 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                  {selected.code}
                </span>
                <span className="truncate">{selected.name}</span>
              </span>
            ) : (
              selected.label
            )
          ) : (
            placeholder || "Select..."
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-cyan-300" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.88)] ${
            wide ? "left-0 w-full sm:w-[360px]" : "left-0 right-0"
          }`}
        >
          <div className="space-y-0.5">
            {options.map((opt) => {
              const active = opt.id === value;
              const isPractical = /practical|sessional|\blab\b/i.test(opt.name || "");
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-start justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    active
                      ? "bg-cyan-500/20 font-semibold text-cyan-200"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    {opt.code && (
                      <span
                        className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          active ? "bg-cyan-500/25 text-cyan-200" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {opt.code}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
                      {opt.name || opt.label}
                      {isPractical && (
                        <span className="ml-1.5 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-300">
                          Practical
                        </span>
                      )}
                    </span>
                  </div>
                  {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionBankSection({
  mode,
  items,
  takenSlots,
  subjects,
  terms,
  currentTermId,
}: QuestionBankSectionProps) {
  const [selectedTermId, setSelectedTermId] = useState(currentTermId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [selectedCtFilter, setSelectedCtFilter] = useState<string>("all");
  const [loadingAccessId, setLoadingAccessId] = useState<string | null>(null);
  const [activeUploaderProfile, setActiveUploaderProfile] = useState<NonNullable<QuestionBankItem["uploader"]> | null>(null);
  const [accessError, setAccessError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [uploadYear, setUploadYear] = useState<number>(new Date().getFullYear());
  const [uploadCt, setUploadCt] = useState<number>(1);
  const [uploadBatch, setUploadBatch] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [pdfFormatMode, setPdfFormatMode] = useState<"ai_text" | "photo_pdf">("ai_text");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{
    step: 0 | 1 | 2 | 3 | 4;
    percent: number;
    loadedBytes: number;
    totalBytes: number;
  }>({ step: 0, percent: 0, loadedBytes: 0, totalBytes: 0 });
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const termSubjects = useMemo(
    () => subjects.filter((s) => s.term_id === selectedTermId),
    [subjects, selectedTermId],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.question_type !== mode) return false;
      if (item.term_id !== selectedTermId) return false;
      if (selectedSubjectId !== "all" && item.subject_id !== selectedSubjectId) return false;
      if (mode === "previous_year" && selectedYearFilter !== "all") {
        if (String(item.exam_year ?? "") !== selectedYearFilter) return false;
      }
      if (mode === "ct" && selectedCtFilter !== "all") {
        if (String(item.ct_number ?? "") !== selectedCtFilter) return false;
      }
      return true;
    });
  }, [items, mode, selectedTermId, selectedSubjectId, selectedYearFilter, selectedCtFilter]);

  const primaryItems = useMemo(
    () => filteredItems.filter((item) => !item.is_reference),
    [filteredItems],
  );

  const referenceItems = useMemo(
    () => filteredItems.filter((item) => Boolean(item.is_reference)),
    [filteredItems],
  );

  const availableYears = useMemo(() => {
    const yrs = new Set<number>();
    for (const item of items) {
      if (item.question_type === "previous_year" && item.term_id === selectedTermId && item.exam_year) {
        yrs.add(item.exam_year);
      }
    }
    return Array.from(yrs).sort((a, b) => b - a);
  }, [items, selectedTermId]);

  const openOrDownload = async (itemId: string, action: "view" | "download") => {
    setAccessError("");
    setLoadingAccessId(`${itemId}:${action}`);
    try {
      const res = await fetch("/api/questions/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data?.error || "Could not access question paper.");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : "Failed to open question.");
    } finally {
      setLoadingAccessId(null);
    }
  };

  const openUploadModal = (prefillSubjectId?: string, prefillCt?: number) => {
    setUploadError("");
    setUploadSuccess("");
    setUploadStatus("");
    setUploadProgress({ step: 0, percent: 0, loadedBytes: 0, totalBytes: 0 });
    setSelectedFiles([]);
    setUploadNotes("");
    setUploadBatch("");
    setUploadSubjectId(prefillSubjectId || (selectedSubjectId !== "all" ? selectedSubjectId : termSubjects[0]?.id || ""));
    if (prefillCt) setUploadCt(prefillCt);
    setModalOpen(true);
  };

  const activeUploadSubject = useMemo(
    () => subjects.find((s) => s.id === uploadSubjectId) || null,
    [subjects, uploadSubjectId],
  );

  const slotConflict = useMemo(() => {
    if (!activeUploadSubject) return null;
    return takenSlots.find((s) => {
      if (s.question_type !== mode) return false;
      if (s.subject_code !== activeUploadSubject.subject_code || s.term_id !== activeUploadSubject.term_id) {
        return false;
      }
      if (mode === "previous_year") return s.exam_year === uploadYear;
      return s.ct_number === uploadCt;
    }) || null;
  }, [activeUploadSubject, takenSlots, mode, uploadYear, uploadCt]);

  const handleQuestionUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setUploadError("");
    setUploadSuccess("");

    if (!uploadSubjectId || !activeUploadSubject) {
      setUploadError("Please select a subject.");
      return;
    }
    if (slotConflict) {
      setUploadError(
        `This question slot is ${slotConflict.status === "approved" ? "already uploaded" : "already pending review"}. Duplicate uploads are blocked.`,
      );
      return;
    }
    if (selectedFiles.length === 0) {
      setUploadError("Please select a PDF or 1-10 question photos.");
      return;
    }

    setUploading(true);
    try {
      const baseName =
        mode === "previous_year"
          ? `${activeUploadSubject.subject_code}_PYQ_${uploadYear}.pdf`
          : `${activeUploadSubject.subject_code}_CT${uploadCt}.pdf`;

      const isSinglePdf =
        selectedFiles.length === 1 &&
        selectedFiles[0] &&
        (selectedFiles[0].type === "application/pdf" ||
          selectedFiles[0].name.toLowerCase().endsWith(".pdf"));

      let pdfFile: File;
      if (isSinglePdf) {
        setUploadProgress({ step: 2, percent: 50, loadedBytes: 0, totalBytes: (selectedFiles[0]?.size ?? 0) });
        pdfFile = selectedFiles[0] as File;
      } else if (pdfFormatMode === "ai_text") {
        setUploadProgress({ step: 1, percent: 22, loadedBytes: 0, totalBytes: 0 });
        setUploadStatus("AI is reading question format & text...");
        const ocrForm = new FormData();
        for (const f of selectedFiles.slice(0, 8)) {
          const compressed = await compressImageForOcr(f);
          ocrForm.append("images", compressed);
        }
        setUploadProgress({ step: 1, percent: 38, loadedBytes: 0, totalBytes: 0 });
        const ocrRes = await fetch("/api/questions/extract", {
          method: "POST",
          body: ocrForm,
        });
        const ocrText = await ocrRes.text();
        let ocrData: { success?: boolean; extracted?: unknown; error?: string };
        try {
          ocrData = JSON.parse(ocrText);
        } catch {
          throw new Error("AI vision server timed out. Please retry or use Original Photo PDF.");
        }
        if (!ocrRes.ok || !ocrData.success || !ocrData.extracted) {
          throw new Error(ocrData?.error || "Could not extract text from question photo.");
        }
        setUploadProgress({ step: 2, percent: 58, loadedBytes: 0, totalBytes: 0 });
        setUploadStatus("Generating clean formatted A4 PDF...");
        pdfFile = await buildCleanQuestionPdf(ocrData.extracted, baseName);
      } else {
        setUploadProgress({ step: 2, percent: 52, loadedBytes: 0, totalBytes: 0 });
        setUploadStatus("Merging photos into A4 PDF...");
        pdfFile = await convertImagesToSinglePdf(selectedFiles, baseName);
      }

      setUploadProgress({ step: 3, percent: 65, loadedBytes: 0, totalBytes: pdfFile.size });
      setUploadStatus("Preparing secure cloud upload...");
      const prepRes = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          subject_id: activeUploadSubject.id,
          question_type: mode,
          exam_year: mode === "previous_year" ? uploadYear : null,
          ct_number: mode === "ct" ? uploadCt : null,
          batch_label: uploadBatch.trim() || null,
          notes: uploadNotes.trim() || null,
          file_name: pdfFile.name,
          file_size: pdfFile.size,
        }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok || !prepData.success) {
        throw new Error(prepData?.error || "Could not prepare question upload.");
      }

      setUploadStatus("Uploading PDF to Cloud Storage...");
      if (typeof prepData.uploadUrl === "string" && prepData.uploadUrl.length > 0) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", prepData.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", "application/pdf");
          xhr.upload.onprogress = (ev) => {
            if (!ev.lengthComputable || ev.total <= 0) return;
            const frac = ev.loaded / ev.total;
            setUploadProgress({
              step: 3,
              percent: Math.min(92, Math.round(65 + frac * 27)),
              loadedBytes: ev.loaded,
              totalBytes: ev.total,
            });
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error("Cloud upload failed."));
          };
          xhr.onerror = () => reject(new Error("Network error while uploading PDF."));
          xhr.send(pdfFile);
        });
      } else {
        const sb = createClient();
        const { error: sbErr } = await sb.storage
          .from("academic-materials")
          .upload(prepData.filePath, pdfFile, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (sbErr) throw new Error(sbErr.message || "Storage upload failed.");
      }

      setUploadProgress({ step: 4, percent: 96, loadedBytes: pdfFile.size, totalBytes: pdfFile.size });
      setUploadStatus("Saving question record...");
      const finRes = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finalize",
          item_id: prepData.itemId,
          file_path: prepData.filePath,
          subject_id: activeUploadSubject.id,
          question_type: mode,
          exam_year: mode === "previous_year" ? uploadYear : null,
          ct_number: mode === "ct" ? uploadCt : null,
          batch_label: uploadBatch.trim() || null,
          notes: uploadNotes.trim() || null,
          file_name: pdfFile.name,
          file_size: pdfFile.size,
        }),
      });
      const finData = await finRes.json();
      if (!finRes.ok || !finData.success) {
        throw new Error(finData?.error || "Could not save question paper.");
      }

      setUploadProgress({ step: 4, percent: 100, loadedBytes: pdfFile.size, totalBytes: pdfFile.size });
      setUploadSuccess(finData.message || "Question submitted!");
      setSelectedFiles([]);
      setUploadNotes("");
      setUploadStatus("");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      setUploadStatus("");
      setUploadProgress({ step: 0, percent: 0, loadedBytes: 0, totalBytes: 0 });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="relative z-30 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <QbDropdown
              label="Academic Term"
              value={selectedTermId}
              onChange={(val) => {
                setSelectedTermId(val);
                setSelectedSubjectId("all");
                setSelectedYearFilter("all");
              }}
              options={terms.map((t) => ({
                id: t.id,
                label: t.id === currentTermId ? `${t.label} (Current)` : t.label,
              }))}
            />

            <QbDropdown
              label={`Subject (${termSubjects.length})`}
              value={selectedSubjectId}
              onChange={setSelectedSubjectId}
              wide
              options={[
                { id: "all", label: "All Subjects in Term" },
                ...termSubjects.map((s) => ({
                  id: s.id,
                  label: `${s.subject_code} - ${s.subject_name}`,
                  code: s.subject_code,
                  name: s.subject_name,
                })),
              ]}
            />

            {mode === "previous_year" ? (
              <QbDropdown
                label="Exam Year"
                value={selectedYearFilter}
                onChange={setSelectedYearFilter}
                options={[
                  { id: "all", label: "All Years" },
                  ...availableYears.map((yr) => ({ id: String(yr), label: String(yr) })),
                ]}
              />
            ) : (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Class Test
                </label>
                <div className="grid h-11 grid-cols-4 gap-1 rounded-xl border border-slate-700/80 bg-[#060A12] p-1">
                  {["all", "1", "2", "3"].map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setSelectedCtFilter(ct)}
                      className={`cursor-pointer rounded-lg text-xs font-semibold transition ${
                        selectedCtFilter === ct
                          ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {ct === "all" ? "All" : `CT-${ct}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => openUploadModal()}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300"
          >
            <Plus className="h-4 w-4" />
            <span>{mode === "previous_year" ? "Add Year Question" : "Add CT Question"}</span>
          </button>
        </div>

        {termSubjects.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={() => setSelectedSubjectId("all")}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                selectedSubjectId === "all"
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              All ({termSubjects.length})
            </button>
            {termSubjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSubjectId(s.id)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  selectedSubjectId === s.id
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {s.subject_code}
              </button>
            ))}
          </div>
        )}
      </section>

      {accessError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{accessError}</span>
        </div>
      )}

      {primaryItems.length === 0 && referenceItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-8 text-center">
          {mode === "previous_year" ? (
            <Calendar className="mx-auto h-9 w-9 text-cyan-400/80" />
          ) : (
            <ClipboardList className="mx-auto h-9 w-9 text-amber-400/80" />
          )}
          <h3 className="mt-3 text-base font-bold text-white">
            {mode === "previous_year"
              ? "No Previous Year Questions Uploaded Yet"
              : "No CT Questions Uploaded Yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            Have the question paper or photos? Upload them directly—photos are automatically converted into a clean A4 PDF for everyone in your batch &amp; department.
          </p>
          <button
            type="button"
            onClick={() => openUploadModal()}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
          >
            <Plus className="h-4 w-4" />
            <span>Upload First Question</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const subj = subjects.find(
              (s) => s.id === item.subject_id || (s.subject_code === item.subject_code && s.term_id === item.term_id),
            );
            const isViewing = loadingAccessId === `${item.id}:view`;
            const isDownloading = loadingAccessId === `${item.id}:download`;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0A1020] p-4 transition hover:border-cyan-500/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                      {item.subject_code}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        item.question_type === "previous_year"
                          ? "bg-violet-500/20 text-violet-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {item.question_type === "previous_year"
                        ? `Year ${item.exam_year}`
                        : `CT-${item.ct_number}`}
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-sm font-bold text-white">
                    {subj?.subject_name || item.subject_code}
                  </h3>

                  {item.batch_label && (
                    <p className="mt-1 text-[11px] font-medium text-emerald-300">
                      {item.batch_label}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">
                      {item.notes}
                    </p>
                  )}
                </div>
                  {item.uploader && (
                    <button
                      type="button"
                      onClick={() => setActiveUploaderProfile(item.uploader ?? null)}
                      className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-800/90 bg-slate-900/60 px-2.5 py-1.5 text-left transition hover:border-cyan-500/40 hover:bg-slate-900"
                    >
                      {item.uploader.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.uploader.avatar_url}
                          alt={item.uploader.full_name}
                          className="h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-200">
                          {item.uploader.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-slate-200">
                          {item.uploader.full_name}
                        </span>
                        {item.uploader.student_id && (
                          <span className="block truncate font-mono text-[10px] text-slate-400">
                            ID: {item.uploader.student_id}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-medium text-cyan-300">Profile</span>
                    </button>
                  )}


                <div className="mt-4 space-y-2.5 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-rose-400" />
                      PDF &middot; {formatBytes(item.file_size_bytes)}
                    </span>
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1" title="Views">
                        <Eye className="h-3.5 w-3.5 text-cyan-400" />
                        {item.views_count}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Downloads">
                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                        {item.downloads_count}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isViewing}
                      onClick={() => openOrDownload(item.id, "view")}
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-60"
                    >
                      {isViewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                      <span>Open</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => openOrDownload(item.id, "download")}
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0A1020] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {mode === "previous_year"
                    ? "Upload Previous Year Question"
                    : "Upload CT Question"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Upload photos (auto-converted to PDF) or a PDF file. Duplicate slots are blocked automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuestionUpload} className="mt-4 space-y-3.5">
              <QbDropdown
                label="Subject *"
                value={uploadSubjectId}
                onChange={setUploadSubjectId}
                options={termSubjects.map((s) => ({
                  id: s.id,
                  label: `${s.subject_code} - ${s.subject_name}`,
                  code: s.subject_code,
                  name: s.subject_name,
                }))}
              />

              <div className="grid grid-cols-2 gap-3">
                {mode === "previous_year" ? (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Exam Year *
                    </label>
                    <input
                      type="number"
                      min={2010}
                      max={2035}
                      value={uploadYear}
                      onChange={(e) => setUploadYear(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      CT Number *
                    </label>
                    <div className="grid h-10 grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setUploadCt(n)}
                          className={`rounded-xl text-xs font-bold transition ${
                            uploadCt === n
                              ? "bg-amber-400 text-slate-950"
                              : "border border-slate-700 bg-[#060A12] text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          CT-{n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Batch / Sir (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadBatch}
                    onChange={(e) => setUploadBatch(e.target.value)}
                    placeholder="e.g. 8th Batch"
                    className="h-10 w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {slotConflict && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>
                    {slotConflict.status === "approved"
                      ? "This exact question has already been uploaded and approved! Duplicate upload is disabled."
                      : "This exact question is already submitted and waiting for admin review!"}
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Question Photos (Multi-select) or PDF *
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cyan-500/40 bg-[#060A12] p-4 text-center hover:border-cyan-400">
                  <ImageIcon className="h-6 w-6 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file(s) selected`
                      : "Select Question Photos (JPG/PNG) or PDF"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Multiple photos will automatically merge into 1 clean A4 PDF
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedFiles.length > 0 &&
                !selectedFiles.every((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) && (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      PDF Output Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfFormatMode("ai_text")}
                        className={`rounded-xl border p-2.5 text-left text-xs transition ${
                          pdfFormatMode === "ai_text"
                            ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                            : "border-slate-700 bg-[#060A12] text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="font-bold">AI Clean Text PDF</div>
                        <div className="mt-0.5 text-[10px] opacity-80">Exact format, copyable text</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfFormatMode("photo_pdf")}
                        className={`rounded-xl border p-2.5 text-left text-xs transition ${
                          pdfFormatMode === "photo_pdf"
                            ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                            : "border-slate-700 bg-[#060A12] text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="font-bold">Original Photo PDF</div>
                        <div className="mt-0.5 text-[10px] opacity-80">Best if paper has diagrams</div>
                      </button>
                    </div>
                  </div>
                )}

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Short Note / Topics (Optional)
                </label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="e.g. Ch 1-3 covered, held on 15 Nov"
                  className="h-10 w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {uploadError && (
                <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}
              {(uploading || uploadProgress.percent === 100) && uploadProgress.step > 0 && (
                <div className="rounded-xl border border-cyan-500/35 bg-[#060A12] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-200">
                      {uploadProgress.percent === 100 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                      )}
                      <span>{uploadStatus || "Completed!"}</span>
                    </span>
                    <span className="font-mono font-bold text-cyan-300">{uploadProgress.percent}%</span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        uploadProgress.percent === 100
                          ? "bg-emerald-400"
                          : "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400"
                      }`}
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>

                  <div className="mt-2.5 grid grid-cols-4 gap-1 text-center text-[10px] font-semibold">
                    {[
                      { s: 1, label: "1. AI Read" },
                      { s: 2, label: "2. Build PDF" },
                      { s: 3, label: "3. Upload" },
                      { s: 4, label: "4. Done" },
                    ].map((st) => {
                      const active = uploadProgress.step === st.s && uploadProgress.percent < 100;
                      const done = uploadProgress.step > st.s || uploadProgress.percent === 100;
                      return (
                        <div
                          key={st.s}
                          className={`rounded-lg px-1 py-1 ${
                            done
                              ? "bg-emerald-500/20 text-emerald-300"
                              : active
                                ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                                : "bg-slate-900 text-slate-500"
                          }`}
                        >
                          {st.label}
                        </div>
                      );
                    })}
                  </div>

                  {uploadProgress.totalBytes > 0 && (
                    <div className="mt-1.5 text-right text-[10px] text-slate-400">
                      {formatBytes(uploadProgress.loadedBytes)} / {formatBytes(uploadProgress.totalBytes)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploading || Boolean(slotConflict)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  <span>{uploading ? "Uploading..." : "Convert & Submit"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uploader Profile Modal */}
      {activeUploaderProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setActiveUploaderProfile(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#0B1221] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {activeUploaderProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeUploaderProfile.avatar_url}
                    alt={activeUploaderProfile.full_name}
                    className="h-12 w-12 rounded-full border border-cyan-500/30 object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/15 text-base font-bold text-cyan-200">
                    {activeUploaderProfile.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {activeUploaderProfile.full_name}
                  </h3>
                  <p className="text-xs text-slate-400">Question Contributor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveUploaderProfile(null)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-800/90 bg-[#070D19] p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Student ID</span>
                <span className="font-mono font-semibold text-white">
                  {activeUploaderProfile.student_id || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Department</span>
                <span className="font-semibold text-cyan-300">
                  {activeUploaderProfile.dept_code || "JTEC"}
                </span>
              </div>
              {activeUploaderProfile.email && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Email</span>
                  <span className="truncate font-medium text-slate-200">
                    {activeUploaderProfile.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
