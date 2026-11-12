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
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-200">
            Material File
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Open this pending {formattedFileType} securely for review.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenFile}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:from-sky-400 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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