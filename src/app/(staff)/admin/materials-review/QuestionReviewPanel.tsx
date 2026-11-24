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
  const [handledIds, setHandledIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [rejectTarget, setRejectTarget] = useState<PendingQuestionReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const visibleItems = items.filter((it) => !handledIds.includes(it.id));
  if (visibleItems.length === 0) return null;

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

  const moderate = async (itemId: string, action: "approve" | "reject", customReason?: string) => {
    setError("");
    setBusyId(`${action}:${itemId}`);
    try {
      const res = await fetch("/api/questions/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          action,
          reason: action === "reject" ? (customReason?.trim() || "Rejected by staff review") : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || "Moderation failed.");
      setHandledIds((prev) => [...prev, itemId]);
      if (action === "reject") {
        setRejectTarget(null);
        setRejectReason("");
      }
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
          Pending Question Bank Submissions ({visibleItems.length})
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
        {visibleItems.map((q) => (
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
                onClick={() => {
                  setError("");
                  setRejectTarget(q);
                  setRejectReason("");
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
              >
                {busyId === `reject:${q.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => (busyId ? null : setRejectTarget(null))}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-500/35 bg-[#0B1221] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Reject Question Submission</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {rejectTarget.subject_code} (
                  {rejectTarget.question_type === "ct"
                    ? `CT-${rejectTarget.ct_number ?? ""}`
                    : `Year ${rejectTarget.exam_year ?? ""}`}
                  ) ? the student will receive your message in Notifications.
                </p>
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setRejectTarget(null)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "Photo is blurry or unreadable ? please re-upload clearly.",
                "Diagram or table got cut off ? please try Original Photo PDF.",
                "Wrong subject or term selected ? please re-upload under the correct one.",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectReason(preset)}
                  className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-rose-400/50 hover:text-white"
                >
                  {preset.split("?")[0]?.trim()}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Write the reason for rejection and what the student should fix before re-uploading..."
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500/60 focus:outline-none"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setRejectTarget(null)}
                className="cursor-pointer rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId !== null || rejectReason.trim().length < 3}
                onClick={() => moderate(rejectTarget.id, "reject", rejectReason)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {busyId === `reject:${rejectTarget.id}` && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Confirm Reject &amp; Notify
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}