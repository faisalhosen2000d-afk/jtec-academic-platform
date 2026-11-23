"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2, X, FileText } from "lucide-react";

export type PendingQuestionReviewItem = {
  id: string;
  subject_code: string;
  question_type: "previous_year" | "ct";
  exam_year: number | null;
  ct_number: number | null;
  batch_label: string | null;
  notes: string | null;
  file_size_bytes: number;
  created_at: string;
};

export default function QuestionReviewPanel({
  items,
}: {
  items: PendingQuestionReviewItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (items.length === 0) return null;

  const openFile = async (itemId: string) => {
    setError("");
    setBusyId(`open:${itemId}`);
    try {
      const res = await fetch("/api/questions/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "view" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.error || "Failed to open question.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open file.");
    } finally {
      setBusyId(null);
    }
  };

  const moderate = async (itemId: string, action: "approve" | "reject") => {
    setError("");
    setBusyId(`${action}:${itemId}`);
    try {
      const res = await fetch("/api/questions/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          action,
          reason: action === "reject" ? "Rejected by staff review" : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || "Moderation failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-white">
          Pending Question Bank Submissions ({items.length})
        </h2>
        <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
          PYQ &amp; CT Papers
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((q) => (
          <div
            key={q.id}
            className="rounded-2xl border border-slate-800 bg-[#0A1020] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
                {q.subject_code}
              </span>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                {q.question_type === "previous_year"
                  ? `PYQ Year ${q.exam_year}`
                  : `CT-${q.ct_number}`}
              </span>
            </div>

            {q.batch_label && (
              <p className="mt-2 text-xs font-semibold text-emerald-300">{q.batch_label}</p>
            )}
            {q.notes && (
              <p className="mt-1 text-xs text-slate-300">{q.notes}</p>
            )}
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <FileText className="h-3.5 w-3.5 text-rose-400" />
              PDF &middot; {q.file_size_bytes >= 1024 * 1024 ? `${(q.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(q.file_size_bytes / 1024))} KB`}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => openFile(q.id)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25"
              >
                {busyId === `open:${q.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Open PDF
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => moderate(q.id, "approve")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                {busyId === `approve:${q.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => moderate(q.id, "reject")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
              >
                {busyId === `reject:${q.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}