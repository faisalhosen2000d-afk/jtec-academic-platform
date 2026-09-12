"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  bulkDeleteNotices,
  type BulkNoticeDeleteResult,
} from "@/server/actions/notices";
import { Button } from "@/components/ui/button";

export default function BulkDeleteNoticeForm() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<BulkNoticeDeleteResult | null>(null);
  const [isPending, startTransition] = useTransition();

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
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="from_date"
            className="text-sm font-medium"
          >
            From Date
          </label>

          <input
            id="from_date"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="to_date"
            className="text-sm font-medium"
          >
            To Date
          </label>

          <input
            id="to_date"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-medium text-destructive">
          Permanent deletion warning
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          All notices created within the selected date range will be
          permanently deleted. Related notice attachments will also be
          removed.
        </p>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border border-border"
          />

          <span>
            I understand that this action is permanent and cannot be undone.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="outline"
          disabled={isPending || !confirmed}
        >
          {isPending
            ? "Deleting..."
            : "Permanently Delete Notices"}
        </Button>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            result.success
              ? "border-border bg-muted"
              : "border-destructive/30 text-destructive"
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