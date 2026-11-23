"use client";

import { useMemo, useState } from "react";
import { getStaffQuestionAccessUrl } from "./actions";
import {
  ClipboardList,
  ExternalLink,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";

export interface LibraryQuestionItem {
  id: string;
  subject_code: string;
  subject_name: string;
  question_type: "previous_year" | "ct";
  exam_year: number | null;
  ct_number: number | null;
  batch_label: string | null;
  department_code: string;
  level_name: string;
  term_name: string;
  file_size_bytes: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return "1 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function QuestionLibrarySection({
  initialItems,
  canDelete,
}: {
  initialItems: LibraryQuestionItem[];
  canDelete: boolean;
}) {
  const [items, setItems] = useState<LibraryQuestionItem[]>(initialItems);
  const [typeFilter, setTypeFilter] = useState<"all" | "ct" | "previous_year">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loadingOpenId, setLoadingOpenId] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<LibraryQuestionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const deptOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.department_code))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.question_type !== typeFilter) return false;
      if (deptFilter !== "all" && item.department_code !== deptFilter) return false;
      if (!q) return true;
      return (
        item.subject_code.toLowerCase().includes(q) ||
        item.subject_name.toLowerCase().includes(q) ||
        (item.batch_label ?? "").toLowerCase().includes(q) ||
        item.department_code.toLowerCase().includes(q)
      );
    });
  }, [items, typeFilter, deptFilter, query]);

  async function handleOpen(itemId: string) {
    setErrorMsg("");
    setLoadingOpenId(itemId);
    try {
      const res = await getStaffQuestionAccessUrl(itemId, "open");
      if (!res.success || !res.url) {
        throw new Error(res.error || "Unable to open question file.");
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to open question file.");
    } finally {
      setLoadingOpenId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteItem) return;
    setErrorMsg("");
    setDeletingId(confirmDeleteItem.id);
    try {
      const res = await fetch("/api/questions/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: confirmDeleteItem.id, action: "delete" }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete question.");
      }
      setItems((prev) => prev.filter((q) => q.id !== confirmDeleteItem.id));
      setConfirmDeleteItem(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete question.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-300">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Approved CT &amp; Previous Year Questions ({items.length})
              </h2>
              <p className="text-xs text-slate-400">
                Manage published question bank papers. Deleting removes the record and purges the file from cloud storage.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject code, name, dept..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pr-3 pl-9 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            {(["all", "ct", "previous_year"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  typeFilter === t
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "all" ? "All" : t === "ct" ? "CT" : "Previous Year"}
              </button>
            ))}
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-8 text-center text-xs text-slate-400">
            No approved question bank items match this filter.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#070C18] p-4"
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
                        ? `Year ${item.exam_year ?? ""}`
                        : `CT-${item.ct_number ?? ""}`}
                    </span>
                  </div>

                  <p className="mt-2 inline-block rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {item.department_code} ? {[item.level_name, item.term_name].filter(Boolean).join(" - ")}
                  </p>

                  <h3 className="mt-2 text-sm font-bold text-white">
                    {item.subject_name}
                  </h3>

                  {item.batch_label && (
                    <p className="mt-1 text-[11px] text-emerald-300">{item.batch_label}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                  <span className="text-[11px] text-slate-400">
                    PDF ? {formatBytes(item.file_size_bytes)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loadingOpenId === item.id}
                      onClick={() => handleOpen(item.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-60"
                    >
                      {loadingOpenId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      Open
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteItem(item)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDeleteItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => (deletingId ? null : setConfirmDeleteItem(null))}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-500/35 bg-[#0B1221] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Permanently Delete Question?</h3>
            <p className="mt-2 text-xs text-slate-300">
              This will permanently remove{" "}
              <span className="font-semibold text-white">
                {confirmDeleteItem.subject_code} (
                {confirmDeleteItem.question_type === "previous_year"
                  ? `Year ${confirmDeleteItem.exam_year ?? ""}`
                  : `CT-${confirmDeleteItem.ct_number ?? ""}`}
                )
              </span>{" "}
              from the database and purge its PDF from Backblaze B2 / Supabase Storage.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setConfirmDeleteItem(null)}
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
