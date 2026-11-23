"use client";

import { useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Loader2, Search, Trash2 } from "lucide-react";
import { getSuperAdminQuestionOpenUrl } from "./question-actions";

export interface ApprovedQuestionRow {
  id: string;
  subject_code: string;
  subject_name: string;
  question_type: "previous_year" | "ct";
  exam_year: number | null;
  ct_number: number | null;
  batch_label: string | null;
  department_code: string;
  term_label: string;
  uploader_name: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return "1 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function QuestionBankApprovedSection({
  initialQuestions,
}: {
  initialQuestions: ApprovedQuestionRow[];
}) {
  const [items, setItems] = useState<ApprovedQuestionRow[]>(initialQuestions);
  const [typeFilter, setTypeFilter] = useState<"all" | "ct" | "previous_year">("all");
  const [query, setQuery] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ApprovedQuestionRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.question_type !== typeFilter) return false;
      if (!q) return true;
      return (
        item.subject_code.toLowerCase().includes(q) ||
        item.subject_name.toLowerCase().includes(q) ||
        item.department_code.toLowerCase().includes(q) ||
        item.uploader_name.toLowerCase().includes(q) ||
        (item.batch_label ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, typeFilter, query]);

  async function handleOpen(itemId: string) {
    setErrorMsg("");
    setOpeningId(itemId);
    try {
      const res = await getSuperAdminQuestionOpenUrl(itemId);
      if (!res.success || !res.url) {
        throw new Error(res.error || "Unable to open question.");
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to open question.");
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete() {
    if (!confirmItem) return;
    setErrorMsg("");
    setDeletingId(confirmItem.id);
    try {
      const res = await fetch("/api/questions/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: confirmItem.id, action: "delete" }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete question.");
      }
      setItems((prev) => prev.filter((q) => q.id !== confirmItem.id));
      setConfirmItem(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete question.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#0A1020] p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-300">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-bold text-white">
              Approved CT &amp; Previous Year Questions ({items.length})
            </h2>
            <p className="text-xs text-slate-400">
              Deleting any question permanently removes its record and purges the PDF from Backblaze B2 / Supabase Storage.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, dept, uploader..."
              className="rounded-xl border border-slate-800 bg-slate-950/80 py-1.5 pr-3 pl-8 text-xs text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            {(["all", "ct", "previous_year"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  typeFilter === t
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "all" ? "All" : t === "ct" ? "CT" : "Previous Year"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {errorMsg}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/50 p-6 text-center text-xs text-slate-400">
          No approved CT or Previous Year questions match this filter.
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-800/70 rounded-xl border border-slate-800/80 bg-[#070C18]">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                    {item.subject_code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      item.question_type === "previous_year"
                        ? "bg-violet-500/20 text-violet-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {item.question_type === "previous_year"
                      ? `Year ${item.exam_year ?? ""}`
                      : `CT-${item.ct_number ?? ""}`}
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {item.department_code} ? {item.term_label}
                  </span>
                  {item.batch_label && (
                    <span className="text-[11px] text-emerald-300">{item.batch_label}</span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-white">
                  {item.subject_name}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Uploaded by {item.uploader_name} ? {formatBytes(item.file_size_bytes)} ? {item.views_count} views ? {item.downloads_count} downloads
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={openingId === item.id}
                  onClick={() => handleOpen(item.id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-60"
                >
                  {openingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmItem(item)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => (deletingId ? null : setConfirmItem(null))}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-500/35 bg-[#0B1221] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Permanently Delete Question?</h3>
            <p className="mt-2 text-xs text-slate-300">
              This will permanently delete{" "}
              <span className="font-semibold text-white">
                {confirmItem.subject_code} (
                {confirmItem.question_type === "previous_year"
                  ? `Year ${confirmItem.exam_year ?? ""}`
                  : `CT-${confirmItem.ct_number ?? ""}`}
                )
              </span>{" "}
              from the database and purge its file from Backblaze B2 / Supabase Storage.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setConfirmItem(null)}
                className="cursor-pointer rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleDelete}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {deletingId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
