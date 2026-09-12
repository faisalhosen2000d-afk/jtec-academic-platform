"use client";

import { useState } from "react";

type ReviewFileActionsProps = {
  materialId: string;
  fileType: string;
};

export default function ReviewFileActions({
  materialId,
  fileType,
}: ReviewFileActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOpenFile() {
    setLoading(true);
    setError("");

    let openedWindow: Window | null = null;

    try {
      openedWindow = window.open("about:blank", "_blank");

      if (!openedWindow) {
        throw new Error(
          "The browser blocked the new tab. Please allow pop-ups for this site and try again."
        );
      }

      openedWindow.opener = null;

      const response = await fetch("/api/materials/review-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success || !result?.url) {
        throw new Error(
          result?.error || "Unable to open this material file."
        );
      }

      openedWindow.location.href = result.url;
    } catch (err) {
      if (openedWindow && !openedWindow.closed) {
        openedWindow.close();
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this material file."
      );
    } finally {
      setLoading(false);
    }
  }

  const formattedFileType = fileType.includes("/")
    ? fileType.split("/").pop()?.toUpperCase() ?? "FILE"
    : fileType.toUpperCase();

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Material File
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Open this pending {formattedFileType} securely for review.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenFile}
          disabled={loading}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Opening..." : "Open File"}
        </button>
      </div>

      {error && (
        <p
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}