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
  ChevronRight,
  Check,
  Folder,
  FolderPlus,
  FolderInput,
  Pencil,
  Trash2,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildCleanQuestionPdf, compressImageForOcr, convertImagesToSinglePdf } from "@/lib/images-to-pdf";

export type QuestionBankFolder = {
  id: string;
  department_id: string;
  term_id: string;
  subject_id: string;
  subject_code: string;
  question_type: "previous_year" | "ct";
  parent_id: string | null;
  name: string;
  created_by: string;
  created_at: string;
};

export type QuestionBankItem = {
  id: string;
  subject_id: string;
  subject_code: string;
  level_id: string;
  term_id: string;
  folder_id?: string | null;
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
    dept_name?: string | null;
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
  folders?: QuestionBankFolder[];
  highlightQuestionId?: string | null;
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
  folders = [],
  highlightQuestionId,
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
  const [pulsingId, setPulsingId] = useState<string | null>(null);

  // Google Drive-style Folder State
  const [viewMode, setViewMode] = useState<"folders" | "all">("folders");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [localFolders, setLocalFolders] = useState<QuestionBankFolder[]>(folders);
  const [itemFolderOverrides, setItemFolderOverrides] = useState<Record<string, string | null>>({});

  // Folder Create / Rename / Move Modals
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "rename";
    folderId?: string;
    initialName: string;
  } | null>(null);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState("");
  const [movingItem, setMovingItem] = useState<QuestionBankItem | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<QuestionBankFolder | null>(null);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>("");

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  // Reset folder path when switching between PYQ and CT tabs
  useEffect(() => {
    setActiveFolderId(null);
    setSelectedSubjectId("all");
    setSelectedYearFilter("all");
    setSelectedCtFilter("all");
    setFolderFeedback("");
  }, [mode]);

  const effectiveItems = useMemo(
    () =>
      items.map((it) =>
        Object.prototype.hasOwnProperty.call(itemFolderOverrides, it.id)
          ? { ...it, folder_id: itemFolderOverrides[it.id] ?? null }
          : it,
      ),
    [items, itemFolderOverrides],
  );

  useEffect(() => {
    if (!highlightQuestionId) return;
    const target = effectiveItems.find((i) => i.id === highlightQuestionId && i.question_type === mode);
    if (!target) return;
    setSelectedTermId(target.term_id);
    setSelectedSubjectId(target.subject_id);
    setActiveFolderId(target.folder_id ?? null);
    setSelectedYearFilter("all");
    setSelectedCtFilter("all");
    setPulsingId(target.id);

    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`q-card-${target.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);

    const clearTimer = window.setTimeout(() => {
      setPulsingId(null);
    }, 4500);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightQuestionId, effectiveItems, mode]);

  const [accessError, setAccessError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [uploadYear, setUploadYear] = useState<number>(new Date().getFullYear());
  const [uploadCt, setUploadCt] = useState<number>(1);
  const [uploadBatch, setUploadBatch] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [pdfFormatMode, setPdfFormatMode] = useState<"ai_text" | "photo_pdf">("ai_text");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [figureSnips, setFigureSnips] = useState<Array<{ id: string; file: File; previewUrl: string; questionNumber: string }>>([]);
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

  const activeSubjectObj = useMemo(
    () =>
      selectedSubjectId !== "all"
        ? termSubjects.find((s) => s.id === selectedSubjectId) || null
        : null,
    [termSubjects, selectedSubjectId],
  );

  // Folders belonging to current term, mode & selected subject
  const subjectFolders = useMemo(() => {
    if (!activeSubjectObj) return [];
    return localFolders.filter(
      (f) =>
        f.question_type === mode &&
        f.term_id === selectedTermId &&
        (f.subject_id === activeSubjectObj.id || f.subject_code === activeSubjectObj.subject_code),
    );
  }, [localFolders, activeSubjectObj, mode, selectedTermId]);

  const folderBreadcrumb = useMemo(() => {
    if (!activeFolderId) return [];
    const chain: QuestionBankFolder[] = [];
    const map = new Map(subjectFolders.map((f) => [f.id, f]));
    let curr = map.get(activeFolderId) || null;
    const seen = new Set<string>();
    while (curr && !seen.has(curr.id)) {
      seen.add(curr.id);
      chain.unshift(curr);
      curr = curr.parent_id ? map.get(curr.parent_id) || null : null;
    }
    return chain;
  }, [activeFolderId, subjectFolders]);

  const currentChildFolders = useMemo(() => {
    if (!activeSubjectObj) return [];
    return subjectFolders
      .filter((f) => (f.parent_id ?? null) === activeFolderId)
      .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  }, [subjectFolders, activeSubjectObj, activeFolderId]);

  const filteredItems = useMemo(() => {
    return effectiveItems.filter((item) => {
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
  }, [effectiveItems, mode, selectedTermId, selectedSubjectId, selectedYearFilter, selectedCtFilter]);

  const visibleGridItems = useMemo(() => {
    if (viewMode === "all" || selectedSubjectId === "all") {
      return filteredItems;
    }
    const validFolderIds = new Set(subjectFolders.map((f) => f.id));
    return filteredItems.filter((it) => {
      const fid = it.folder_id && validFolderIds.has(it.folder_id) ? it.folder_id : null;
      return fid === activeFolderId;
    });
  }, [viewMode, selectedSubjectId, filteredItems, subjectFolders, activeFolderId]);

  const primaryItems = useMemo(
    () => visibleGridItems.filter((item) => !item.is_reference),
    [visibleGridItems],
  );

  const referenceItems = useMemo(
    () => visibleGridItems.filter((item) => Boolean(item.is_reference)),
    [visibleGridItems],
  );

  const availableYears = useMemo(() => {
    const yrs = new Set<number>();
    for (const item of effectiveItems) {
      if (item.question_type === "previous_year" && item.term_id === selectedTermId && item.exam_year) {
        yrs.add(item.exam_year);
      }
    }
    return Array.from(yrs).sort((a, b) => b - a);
  }, [effectiveItems, selectedTermId]);

  // Count helper for folder badges
  const getFolderItemCount = (folderId: string): number => {
    const childMap = new Map<string, string[]>();
    for (const f of subjectFolders) {
      if (f.parent_id) {
        const arr = childMap.get(f.parent_id) || [];
        arr.push(f.id);
        childMap.set(f.parent_id, arr);
      }
    }
    const branch = new Set<string>([folderId]);
    const stack = [folderId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      for (const cid of childMap.get(id) || []) {
        if (!branch.has(cid)) {
          branch.add(cid);
          stack.push(cid);
        }
      }
    }
    return effectiveItems.filter(
      (it) =>
        it.question_type === mode &&
        it.term_id === selectedTermId &&
        it.folder_id &&
        branch.has(it.folder_id),
    ).length;
  };

  // Folder CRUD Handlers
  const handleSaveFolderModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderModal || folderBusy) return;
    const cleanName = folderNameInput.trim();
    if (!cleanName) return;

    setFolderBusy(true);
    setFolderFeedback("");
    try {
      if (folderModal.mode === "create") {
        if (!activeSubjectObj) throw new Error("Select a subject first.");
        const res = await fetch("/api/questions/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: activeSubjectObj.id,
            question_type: mode,
            parent_id: activeFolderId,
            name: cleanName,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.folder) {
          throw new Error(data?.error || "Could not create folder.");
        }
        setLocalFolders((prev) => [...prev, data.folder as QuestionBankFolder]);
      } else if (folderModal.mode === "rename" && folderModal.folderId) {
        const res = await fetch("/api/questions/folders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rename",
            folder_id: folderModal.folderId,
            name: cleanName,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error || "Could not rename folder.");
        }
        setLocalFolders((prev) =>
          prev.map((f) => (f.id === folderModal.folderId ? { ...f, name: cleanName } : f)),
        );
      }
      setFolderModal(null);
      setFolderNameInput("");
    } catch (err) {
      setFolderFeedback(err instanceof Error ? err.message : "Folder action failed.");
    } finally {
      setFolderBusy(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deletingFolder || folderBusy) return;
    const folder = deletingFolder;
    setFolderBusy(true);
    setFolderFeedback("");
    try {
      const res = await fetch("/api/questions/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folder.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Could not delete folder.");
      }
      const nextParent = folder.parent_id ?? null;
      setLocalFolders((prev) =>
        prev
          .filter((f) => f.id !== folder.id)
          .map((f) => (f.parent_id === folder.id ? { ...f, parent_id: nextParent } : f)),
      );
      setItemFolderOverrides((prev) => {
        const next = { ...prev };
        for (const it of effectiveItems) {
          if (it.folder_id === folder.id) next[it.id] = nextParent;
        }
        return next;
      });
      if (activeFolderId === folder.id) {
        setActiveFolderId(nextParent);
      }
      setDeletingFolder(null);
    } catch (err) {
      setFolderFeedback(err instanceof Error ? err.message : "Could not delete folder.");
      setDeletingFolder(null);
    } finally {
      setFolderBusy(false);
    }
  };

  const handleMoveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingItem || folderBusy) return;
    setFolderBusy(true);
    setFolderFeedback("");
    const destId = targetMoveFolderId.trim() ? targetMoveFolderId.trim() : null;
    try {
      const res = await fetch("/api/questions/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move_item",
          item_id: movingItem.id,
          folder_id: destId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Could not move question.");
      }
      setItemFolderOverrides((prev) => ({ ...prev, [movingItem.id]: destId }));
      setMovingItem(null);
    } catch (err) {
      setFolderFeedback(err instanceof Error ? err.message : "Could not move question.");
    } finally {
      setFolderBusy(false);
    }
  };

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
    setFigureSnips((prev) => { prev.forEach((s) => URL.revokeObjectURL(s.previewUrl)); return []; });
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
        pdfFile = await buildCleanQuestionPdf(ocrData.extracted, baseName, selectedFiles, figureSnips.map((s) => ({ file: s.file, questionNumber: s.questionNumber.trim() || undefined })));
      } else {
        setUploadProgress({ step: 2, percent: 52, loadedBytes: 0, totalBytes: 0 });
        setUploadStatus("Merging photos into A4 PDF...");
        pdfFile = await convertImagesToSinglePdf(selectedFiles, baseName);
      }

      const targetUploadFolderId =
        activeSubjectObj && activeUploadSubject.id === activeSubjectObj.id
          ? activeFolderId
          : null;

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
          folder_id: targetUploadFolderId,
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
          folder_id: targetUploadFolderId,
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
    setFigureSnips((prev) => { prev.forEach((s) => URL.revokeObjectURL(s.previewUrl)); return []; });
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

  // Build hierarchical folder options for the "Move to Folder" modal
  const moveTargetFolderOptions = useMemo(() => {
    if (!movingItem) return [];
    const itemFolders = localFolders.filter(
      (f) =>
        f.question_type === movingItem.question_type &&
        f.term_id === movingItem.term_id &&
        (f.subject_id === movingItem.subject_id || f.subject_code === movingItem.subject_code),
    );
    const byParent = new Map<string | null, QuestionBankFolder[]>();
    for (const f of itemFolders) {
      const key = f.parent_id ?? null;
      const arr = byParent.get(key) || [];
      arr.push(f);
      byParent.set(key, arr);
    }
    const result: Array<{ id: string; label: string }> = [];
    const walk = (parentId: string | null, prefix: string) => {
      for (const f of byParent.get(parentId) || []) {
        const pathLabel = prefix ? `${prefix} / ${f.name}` : f.name;
        result.push({ id: f.id, label: pathLabel });
        walk(f.id, pathLabel);
      }
    };
    walk(null, "");
    return result;
  }, [movingItem, localFolders]);

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
                setActiveFolderId(null);
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
              onChange={(val) => {
                setSelectedSubjectId(val);
                setActiveFolderId(null);
              }}
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Folder View vs All Cards Toggle */}
            <div className="inline-flex h-11 items-center rounded-xl border border-slate-700/80 bg-[#060A12] p-1">
              <button
                type="button"
                onClick={() => setViewMode("folders")}
                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                  viewMode === "folders"
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Folder className="h-3.5 w-3.5" />
                <span>Folders</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                  viewMode === "all"
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>All Cards</span>
              </button>
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
        </div>

        {termSubjects.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId("all");
                setActiveFolderId(null);
              }}
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
                onClick={() => {
                  setSelectedSubjectId(s.id);
                  setActiveFolderId(null);
                }}
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

      {/* Google Drive-style Folder Browser & Breadcrumb */}
      {viewMode === "folders" && (
        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Folder breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubjectId("all");
                  setActiveFolderId(null);
                }}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                  selectedSubjectId === "all"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Folder className="h-3.5 w-3.5 text-amber-400" />
                <span>{mode === "previous_year" ? "Board Questions" : "CT Questions"}</span>
              </button>

              {activeSubjectObj && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                  <button
                    type="button"
                    onClick={() => setActiveFolderId(null)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                      activeFolderId === null
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-[11px] text-cyan-300">
                      {activeSubjectObj.subject_code}
                    </span>
                    <span className="max-w-[200px] truncate">{activeSubjectObj.subject_name}</span>
                  </button>
                </>
              )}

              {folderBreadcrumb.map((crumb, idx) => {
                const isLast = idx === folderBreadcrumb.length - 1;
                return (
                  <span key={crumb.id} className="inline-flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(crumb.id)}
                      className={`cursor-pointer rounded-lg px-2.5 py-1.5 font-semibold transition ${
                        isLast
                          ? "bg-amber-500/20 text-amber-200"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </span>
                );
              })}
            </nav>

            {/* Folder Actions (Back + Create New Folder) */}
            {activeSubjectObj && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (folderBreadcrumb.length > 0) {
                      const curr = folderBreadcrumb[folderBreadcrumb.length - 1];
                      setActiveFolderId(curr?.parent_id ?? null);
                    } else {
                      setSelectedSubjectId("all");
                      setActiveFolderId(null);
                    }
                  }}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-[#060A12] px-3 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFolderFeedback("");
                    setFolderNameInput("");
                    setFolderModal({ mode: "create", initialName: "" });
                  }}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>New Folder</span>
                </button>
              </div>
            )}
          </div>

          {folderFeedback && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{folderFeedback}</span>
            </div>
          )}

          {/* Level 1: Subject Folders Grid */}
          {selectedSubjectId === "all" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {termSubjects.map((subj) => {
                const subjItemsCount = effectiveItems.filter(
                  (it) =>
                    it.question_type === mode &&
                    it.term_id === selectedTermId &&
                    it.subject_id === subj.id,
                ).length;
                const subjSubfoldersCount = localFolders.filter(
                  (f) =>
                    f.question_type === mode &&
                    f.term_id === selectedTermId &&
                    (f.subject_id === subj.id || f.subject_code === subj.subject_code),
                ).length;

                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(subj.id);
                      setActiveFolderId(null);
                    }}
                    className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-800/90 bg-[#060A12] p-3.5 text-left transition hover:border-amber-400/50 hover:bg-[#0D1526]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-300 transition group-hover:scale-105">
                      <Folder className="h-5 w-5 fill-amber-400/20" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                          {subj.subject_code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {subjItemsCount} {subjItemsCount === 1 ? "file" : "files"}
                          {subjSubfoldersCount > 0 ? ` · ${subjSubfoldersCount} folders` : ""}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-slate-100 group-hover:text-amber-200">
                        {subj.subject_name}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-amber-300" />
                  </button>
                );
              })}
            </div>
          ) : (
            /* Level 2+: Nested Custom Folders inside Selected Subject */
            <div className="mt-4">
              {currentChildFolders.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {currentChildFolders.map((folder) => {
                    const count = getFolderItemCount(folder.id);
                    return (
                      <div
                        key={folder.id}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-[#060A12] p-3 transition hover:border-amber-400/50 hover:bg-[#0D1526]"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFolderId(folder.id)}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-300">
                            <Folder className="h-5 w-5 fill-amber-400/25" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-100 group-hover:text-amber-200">
                              {folder.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {count} {count === 1 ? "question" : "questions"}
                            </p>
                          </div>
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            title="Rename Folder"
                            onClick={() => {
                              setFolderFeedback("");
                              setFolderNameInput(folder.name);
                              setFolderModal({
                                mode: "rename",
                                folderId: folder.id,
                                initialName: folder.name,
                              });
                            }}
                            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Folder"
                            onClick={() => { setFolderFeedback(""); setDeletingFolder(folder); }}
                            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-800 bg-[#060A12]/60 px-4 py-3 text-xs text-slate-400">
                  No sub-folders here yet. Click{" "}
                  <span className="font-semibold text-amber-300">+ New Folder</span> to organize by
                  year (e.g. 2024, 2023) or topic, or use{" "}
                  <span className="font-semibold text-cyan-300">Move</span> on any question card
                  below.
                </p>
              )}
            </div>
          )}
        </section>
      )}

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
            {viewMode === "folders" && activeFolderId
              ? "This Folder Has No Questions Yet"
              : mode === "previous_year"
                ? "No Previous Year Questions Uploaded Yet"
                : "No CT Questions Uploaded Yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            {viewMode === "folders" && activeFolderId
              ? "Upload a question directly into this folder or move existing questions here from the subject root."
              : "Have the question paper or photos? Upload them directly—photos are automatically converted into a clean A4 PDF for everyone in your batch & department."}
          </p>
          <button
            type="button"
            onClick={() => openUploadModal()}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
          >
            <Plus className="h-4 w-4" />
            <span>{activeFolderId ? "Upload into This Folder" : "Upload First Question"}</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGridItems.map((item) => {
            const subj = subjects.find(
              (s) => s.id === item.subject_id || (s.subject_code === item.subject_code && s.term_id === item.term_id),
            );
            const isViewing = loadingAccessId === `${item.id}:view`;
            const isDownloading = loadingAccessId === `${item.id}:download`;
            const currentFolderObj = item.folder_id
              ? localFolders.find((f) => f.id === item.folder_id)
              : null;

            return (
              <div
                id={`q-card-${item.id}`}
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border bg-[#0A1020] p-4 transition ${
                  pulsingId === item.id
                    ? "border-emerald-400 ring-2 ring-emerald-400/70 shadow-[0_0_30px_rgba(16,185,129,0.45)] animate-pulse"
                    : "border-slate-800/90 hover:border-cyan-500/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                      {item.subject_code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Move to Folder"
                        onClick={() => {
                          setFolderFeedback("");
                          setMovingItem(item);
                          setTargetMoveFolderId(item.folder_id ?? "");
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700/90 bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition hover:border-amber-400/50 hover:text-amber-200"
                      >
                        <FolderInput className="h-3 w-3 text-amber-400" />
                        <span>Move</span>
                      </button>

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
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {item.source_label && (
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                          item.is_own_dept
                            ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-200"
                            : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                        }`}
                      >
                        {item.source_label}
                      </span>
                    )}

                    {currentFolderObj && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        <Folder className="h-2.5 w-2.5" />
                        {currentFolderObj.name}
                      </span>
                    )}
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

      {/* Create / Rename Folder Modal */}
      {folderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setFolderModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0A1020] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {folderModal.mode === "create" ? "Create New Folder" : "Rename Folder"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFolderModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFolderModal} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Folder Name (e.g. 2024, 2023, Part-A, Solved)
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={80}
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  placeholder="Enter folder name..."
                  className="h-10 w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFolderModal(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={folderBusy || !folderNameInput.trim()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
                >
                  {folderBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{folderModal.mode === "create" ? "Create Folder" : "Save Name"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Question to Folder Modal */}
      {movingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setMovingItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0A1020] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderInput className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Move Question to Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => setMovingItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMoveItemSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Destination Folder ({movingItem.subject_code})
                </label>
                <select
                  value={targetMoveFolderId}
                  onChange={(e) => setTargetMoveFolderId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="">{movingItem.subject_code} (Subject Root)</option>
                  {moveTargetFolderOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {moveTargetFolderOptions.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Open the subject folder first and click &ldquo;+ New Folder&rdquo; to create folders.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovingItem(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={folderBusy}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                >
                  {folderBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Move Here</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {deletingFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => !folderBusy && setDeletingFolder(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0A1020] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/15 text-rose-400">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Delete Folder</h3>
                  <p className="text-[11px] text-slate-400">Safe folder removal</p>
                </div>
              </div>
              <button
                type="button"
                disabled={folderBusy}
                onClick={() => setDeletingFolder(null)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <p className="text-xs leading-relaxed text-slate-200">
                Are you sure you want to delete folder{" "}
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-bold text-amber-300">
                  {deletingFolder.name}
                </span>
                ?
              </p>
              <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-200">
                Any questions or sub-folders inside will be moved safely up to the parent folder—nothing will be deleted.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={folderBusy}
                onClick={() => setDeletingFolder(null)}
                className="cursor-pointer rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={folderBusy}
                onClick={confirmDeleteFolder}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] transition hover:bg-rose-400 disabled:opacity-50"
              >
                {folderBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{folderBusy ? "Deleting..." : "Delete Folder"}</span>
              </button>
            </div>
          </div>
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

                    {pdfFormatMode === "ai_text" && (
                      <div
                        tabIndex={0}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items;
                          if (!items) return;
                          const pasted: File[] = [];
                          for (let i = 0; i < items.length; i++) {
                            const it = items[i];
                            if (it && it.type.startsWith("image/")) {
                              const f = it.getAsFile();
                              if (f) pasted.push(f);
                            }
                          }
                          if (pasted.length > 0) {
                            e.preventDefault();
                            setFigureSnips((prev) => [
                              ...prev,
                              ...pasted.map((f) => ({
                                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                file: f,
                                previewUrl: URL.createObjectURL(f),
                                questionNumber: "",
                              })),
                            ]);
                          }
                        }}
                        className="mt-2.5 rounded-xl border border-amber-500/35 bg-amber-500/5 p-3 focus:border-amber-400 focus:outline-none"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-bold text-amber-200">
                              Close-up Diagram / Figure Snips (Optional)
                            </div>
                            <div className="text-[10px] text-slate-400">
                              If the paper has diagrams, select or click here &amp; press <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-amber-300">Ctrl+V</kbd> to paste crisp figure screenshots.
                            </div>
                          </div>
                          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25">
                            <Plus className="h-3 w-3" />
                            <span>Add Snip</span>
                            <input
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const picked = Array.from(e.target.files || []);
                                if (picked.length === 0) return;
                                setFigureSnips((prev) => [
                                  ...prev,
                                  ...picked.map((f) => ({
                                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                    file: f,
                                    previewUrl: URL.createObjectURL(f),
                                    questionNumber: "",
                                  })),
                                ]);
                                e.target.value = "";
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {figureSnips.length > 0 && (
                          <div className="mt-2.5 space-y-2">
                            {figureSnips.map((snip, idx) => (
                              <div
                                key={snip.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#060A12] p-2"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={snip.previewUrl}
                                    alt={`Figure ${idx + 1}`}
                                    className="h-10 w-14 shrink-0 rounded border border-slate-700 bg-white object-contain"
                                  />
                                  <div className="min-w-0">
                                    <div className="truncate text-[11px] font-semibold text-slate-200">
                                      Figure #{idx + 1}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Target Question # (e.g. 3 or 8)
                                    </div>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1.5">
                                  <input
                                    type="text"
                                    maxLength={4}
                                    value={snip.questionNumber}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFigureSnips((prev) =>
                                        prev.map((item) =>
                                          item.id === snip.id ? { ...item, questionNumber: val } : item,
                                        ),
                                      );
                                    }}
                                    placeholder="Auto"
                                    className="h-7 w-14 rounded-lg border border-slate-700 bg-slate-900 px-2 text-center font-mono text-[11px] font-bold text-amber-200 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      URL.revokeObjectURL(snip.previewUrl);
                                      setFigureSnips((prev) => prev.filter((item) => item.id !== snip.id));
                                    }}
                                    className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
                  {activeUploaderProfile.dept_name && activeUploaderProfile.dept_code
                    ? `${activeUploaderProfile.dept_name} (${activeUploaderProfile.dept_code})`
                    : activeUploaderProfile.dept_code || activeUploaderProfile.dept_name || "JTEC"}
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