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
    <div className="rounded-xl border border-slate-800/90 bg-gradient-to-r from-[#0E172A] to-[#0A1020] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            Material File
          </p>

          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Open in browser or download this approved{" "}
            <span className="font-semibold text-cyan-300">{formattedFileType}</span>{" "}
            resource.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => handleFileAccess("open")}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-[#0A1020] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-[#111C33] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {loading === "open" ? "Opening..." : "Open"}
          </button>

          <button
            type="button"
            onClick={() => handleFileAccess("download")}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {loading === "download" ? "Preparing..." : "Download"}
          </button>
        </div>
      </div>

      {error && (
        <p
          className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}