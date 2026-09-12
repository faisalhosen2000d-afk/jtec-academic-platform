"use client";

import { useState } from "react";

type MaterialFileActionsProps = {
  materialId: string;
  fileType: string;
};

export default function MaterialFileActions({
  materialId,
  fileType,
}: MaterialFileActionsProps) {
  const [loading, setLoading] = useState<"open" | "download" | null>(null);
  const [error, setError] = useState("");

  async function handleFileAccess(action: "open" | "download") {
    setLoading(action);
    setError("");

    let openedWindow: Window | null = null;

    try {
      if (action === "open") {
        openedWindow = window.open("about:blank", "_blank");

        if (!openedWindow) {
          throw new Error(
            "The browser blocked the new tab. Please allow pop-ups for this site and try again."
          );
        }

        openedWindow.opener = null;
      }

      const response = await fetch("/api/materials/file-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.url) {
        throw new Error(
          data.error || "The material file could not be accessed."
        );
      }

      if (action === "open") {
        openedWindow!.location.href = data.url;
      } else {
        const link = document.createElement("a");
        link.href = data.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = "";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      if (openedWindow && !openedWindow.closed) {
        openedWindow.close();
      }

      setError(
        err instanceof Error
          ? err.message
          : "The material file could not be accessed."
      );
    } finally {
      setLoading(null);
    }
  }

  const formattedFileType = fileType.includes("/")
    ? fileType.split("/").pop()?.toUpperCase() ?? "FILE"
    : fileType.toUpperCase();

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Material File
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Open or download this approved {formattedFileType} file.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleFileAccess("open")}
            disabled={loading !== null}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "open" ? "Opening..." : "Open"}
          </button>

          <button
            type="button"
            onClick={() => handleFileAccess("download")}
            disabled={loading !== null}
            className="inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "download" ? "Preparing..." : "Download"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}