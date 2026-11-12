"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { AlertTriangle, FileText, Loader2, Trash2 } from "lucide-react";
import {
  bulkDeleteNotices,
  previewBulkDeleteNotices,
  type BulkNoticeDeleteResult,
  type BulkNoticePreviewItem,
} from "@/server/actions/notices";

export default function BulkDeleteNoticeForm() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<BulkNoticeDeleteResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const [previewItems, setPreviewItems] = useState<BulkNoticePreviewItem[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreviewError(null);

    if (!fromDate || !toDate) {
      setPreviewItems(null);
      return;
    }

    if (fromDate > toDate) {
      setPreviewItems(null);
      setPreviewError("From Date cannot be after To Date.");
      return;
    }

    setPreviewLoading(true);
    previewBulkDeleteNotices(fromDate, toDate).then((res) => {
      if (cancelled) return;
      setPreviewLoading(false);
      if (res.success) {
        setPreviewItems(res.items);
      } else {
        setPreviewItems(null);
        setPreviewError(res.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    if (!fromDate || !toDate || fromDate > toDate) {
      setResult({
        success: false,
        error: "Please provide a valid date range.",
      });
      return;
    }

    if (!confirmed) {
      setResult({
        success: false,
        error:
          "Please confirm that you understand this action is permanent.",
      });
      return;
    }

    startTransition(async () => {
      const response = await bulkDeleteNotices(fromDate, toDate);
      setResult(response);

      if (response.success) {
        setConfirmed(false);
        setFromDate("");
        setToDate("");
        setPreviewItems(null);
      }
    });
  }

  const totalAttachments =
    previewItems?.reduce((sum, item) => sum + item.attachments.length, 0) ?? 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="from_date"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            From Date
          </label>

          <input
            id="from_date"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-slate-100 [color-scheme:dark] transition-all focus:border-rose-400/80 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="to_date"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            To Date
          </label>

          <input
            id="to_date"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-slate-100 [color-scheme:dark] transition-all focus:border-rose-400/80 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {/* Date Range Live Preview */}
      {(previewLoading || previewError || previewItems !== null) && (
        <div className="rounded-xl border border-slate-800 bg-[#060A12]/90 p-4">
          {previewLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
              <span>Checking notices and attachments in this date range...</span>
            </div>
          ) : previewError ? (
            <p className="text-xs font-medium text-rose-400">{previewError}</p>
          ) : previewItems && previewItems.length === 0 ? (
            <p className="text-xs text-slate-400">
              No notices found in the selected date range.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-semibold text-slate-200">
                  Preview: Matching Notices
                </span>
                <span className="rounded-full border border-rose-500/35 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                  {previewItems?.length} notice(s) &bull; {totalAttachments} attachment(s)
                </span>
              </div>

              <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {previewItems?.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-slate-800/90 bg-slate-900/50 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone: "Asia/Dhaka",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                      </span>
                    </div>

                    {item.attachments.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.attachments.map((file, idx) => (
                          <span
                            key={`${item.id}-att-${idx}`}
                            className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-300"
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="max-w-[220px] truncate">{file}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-4">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-semibold">
            Permanent deletion warning
          </p>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
          All notices created within the selected date range will be
          permanently deleted. Related notice attachments will also be
          removed.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-xs font-medium text-slate-200">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-rose-500/50 bg-[#060A12] accent-rose-500"
          />

          <span>
            I understand that this action is permanent and cannot be undone.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending || !confirmed || (previewItems !== null && previewItems.length === 0)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_rgba(244,63,94,0.35)] transition-all hover:from-rose-500 hover:to-red-400 hover:shadow-[0_0_32px_rgba(244,63,94,0.5)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>
            {isPending
              ? "Deleting..."
              : "Permanently Delete Notices"}
          </span>
        </button>
      </div>

      {result && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium ${
            result.success
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          {result.success
            ? result.deletedCount > 0
              ? `${result.deletedCount} notice(s) were permanently deleted.`
              : "No notices were found in the selected date range."
            : result.error}
        </div>
      )}
    </form>
  );
}