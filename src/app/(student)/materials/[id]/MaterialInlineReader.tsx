"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Maximize2,
  Minimize2,
  Monitor,
  RefreshCw,
  Smartphone,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type MaterialInlineReaderProps = {
  materialId: string;
  title: string;
  fileType: string;
};

type FileKind = "pdf" | "image" | "office" | "other";

function detectFileKind(fileType: string, title: string): FileKind {
  const ft = (fileType || "").toLowerCase();
  const ext = title.includes(".") ? (title.split(".").pop()?.toLowerCase() ?? "") : "";

  if (ft.includes("pdf") || ext === "pdf") return "pdf";
  if (
    ft.includes("image") ||
    ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
  ) {
    return "image";
  }
  if (
    ft.includes("word") ||
    ft.includes("officedocument") ||
    ft.includes("presentation") ||
    ft.includes("powerpoint") ||
    ft.includes("excel") ||
    ft.includes("sheet") ||
    ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)
  ) {
    return "office";
  }
  return "other";
}

function getShortBadge(fileType: string, title: string): string {
  const kind = detectFileKind(fileType, title);
  const ext = title.includes(".") ? (title.split(".").pop()?.toUpperCase() ?? "") : "";
  if (kind === "pdf") return "PDF";
  if (kind === "image") return ext && ext.length <= 4 ? ext : "IMAGE";
  if (kind === "office") return ext && ext.length <= 4 ? ext : "DOC";
  return fileType.includes("/")
    ? (fileType.split("/").pop()?.toUpperCase().slice(0, 5) ?? "FILE")
    : fileType.toUpperCase().slice(0, 5) || "FILE";
}

export default function MaterialInlineReader({
  materialId,
  title,
  fileType,
}: MaterialInlineReaderProps) {
  const fileKind = detectFileKind(fileType, title);
  const badge = getShortBadge(fileType, title);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const [layoutMode, setLayoutMode] = useState<"portrait" | "wide">("portrait");
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);

  const fetchPreviewUrl = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/materials/file-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, action: "open" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || "Could not load inline preview.");
      }
      setFileUrl(String(data.url));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load inline preview.",
      );
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    void fetchPreviewUrl();
  }, [fetchPreviewUrl]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch("/api/materials/file-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, action: "download" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || "Download failed.");
      }
      const link = document.createElement("a");
      link.href = String(data.url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  const embedSrc = (() => {
    if (!fileUrl) return "";
    if (fileKind === "pdf") {
      if (useGoogleViewer) {
        return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      }
      return `${fileUrl}#view=FitH&toolbar=1&navpanes=0`;
    }
    if (fileKind === "office") {
      if (useGoogleViewer) {
        return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      }
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    }
    return fileUrl;
  })();

  const portraitWidthPx = Math.round((760 * zoom) / 100);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-[#050811]/95 backdrop-blur-md"
          : "overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#070C17] shadow-[0_18px_45px_-28px_rgba(16,185,129,0.28)]"
      }
    >
      {/* Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/90 bg-[#0B1222] px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-bold text-white sm:text-sm">
                Inline Portrait Reader
              </span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                {badge}
              </span>
            </div>
            {isFullscreen && (
              <p className="truncate text-[11px] text-slate-400">{title}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {!isCollapsed && fileKind !== "other" && (
            <>
              {/* Portrait / Wide Toggle */}
              <div className="inline-flex rounded-lg border border-slate-700/80 bg-[#060A12] p-0.5">
                <button
                  type="button"
                  onClick={() => setLayoutMode("portrait")}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    layoutMode === "portrait"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Portrait A4 Reading View"
                >
                  <Smartphone className="h-3 w-3" />
                  <span className="hidden sm:inline">Portrait</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("wide")}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    layoutMode === "wide"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Full Width View"
                >
                  <Monitor className="h-3 w-3" />
                  <span className="hidden sm:inline">Wide</span>
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="inline-flex items-center rounded-lg border border-slate-700/80 bg-[#060A12] p-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(75, z - 15))}
                  disabled={zoom <= 75}
                  className="cursor-pointer rounded-md p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="cursor-pointer px-1.5 font-mono text-[11px] font-semibold text-slate-200 hover:text-emerald-300"
                  title="Reset Zoom"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(150, z + 15))}
                  disabled={zoom >= 150}
                  className="cursor-pointer rounded-md p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Mobile/Compatibility Viewer Switch for PDF & Office */}
              {(fileKind === "pdf" || fileKind === "office") && (
                <button
                  type="button"
                  onClick={() => setUseGoogleViewer((v) => !v)}
                  className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                    useGoogleViewer
                      ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                      : "border-slate-700/80 bg-[#060A12] text-slate-300 hover:border-slate-600 hover:text-white"
                  }`}
                  title="Switch viewer engine if preview doesn't load on mobile"
                >
                  {useGoogleViewer ? "Google Viewer" : "Alt Viewer"}
                </button>
              )}
            </>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void fetchPreviewUrl()}
            disabled={loading}
            className="cursor-pointer rounded-lg border border-slate-700/80 bg-[#060A12] p-1.5 text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
            title="Reload Preview"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Open in New Tab */}
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#060A12] px-2 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
              title="Open in New Tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden md:inline">New Tab</span>
            </a>
          )}

          {/* Download */}
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
            title="Download File"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">
              {downloading ? "..." : "Download"}
            </span>
          </button>

          {/* Fullscreen */}
          {!isCollapsed && fileKind !== "other" && (
            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              className="cursor-pointer rounded-lg border border-slate-700/80 bg-[#060A12] p-1.5 text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Mode"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Collapse / Expand (when not fullscreen) */}
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsCollapsed((c) => !c)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700/80 bg-[#060A12] px-2 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
              title={isCollapsed ? "Show Reader" : "Hide Reader"}
            >
              {isCollapsed ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Show</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Hide</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reader Viewport */}
      {!isCollapsed && (
        <div
          className={`overflow-auto bg-[#04070E] p-2.5 sm:p-4 ${
            isFullscreen ? "flex-1" : ""
          }`}
        >
          {loading ? (
            <div className="flex h-[460px] flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
              <p className="text-xs font-medium">
                Preparing inline portrait reader...
              </p>
            </div>
          ) : error ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 p-6 text-center">
              <p className="text-sm font-semibold text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => void fetchPreviewUrl()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B1222] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </button>
            </div>
          ) : fileKind === "image" && fileUrl ? (
            <div className="flex justify-center">
              <div
                style={{
                  width: layoutMode === "portrait" ? `${portraitWidthPx}px` : "100%",
                  maxWidth: layoutMode === "portrait" ? "100%" : `${zoom}%`,
                }}
                className="overflow-hidden rounded-xl border border-slate-800 bg-[#0A1020] shadow-2xl transition-all duration-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt={title}
                  className="mx-auto block h-auto w-full object-contain"
                />
              </div>
            </div>
          ) : (fileKind === "pdf" || fileKind === "office") && embedSrc ? (
            <div className="flex flex-col items-center">
              <div
                style={{
                  width:
                    layoutMode === "portrait"
                      ? `${portraitWidthPx}px`
                      : `${Math.min(100, Math.max(75, zoom))}%`,
                  maxWidth: "100%",
                }}
                className={`overflow-hidden rounded-xl border border-slate-800 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-all duration-200 ${
                  isFullscreen
                    ? "h-[calc(100vh-110px)]"
                    : "h-[68vh] min-h-[520px] sm:h-[78vh] sm:min-h-[640px]"
                }`}
              >
                <iframe
                  key={embedSrc}
                  src={embedSrc}
                  title={title}
                  className="h-full w-full border-0"
                  allow="fullscreen"
                />
              </div>
              <p className="mt-2.5 text-center text-[11px] text-slate-500">
                মোবাইলে প্রিভিউ লোড না হলে উপরের{" "}
                <span className="font-semibold text-slate-300">Alt Viewer</span>{" "}
                বা{" "}
                <span className="font-semibold text-cyan-300">New Tab</span>{" "}
                ক্লিক করুন।
              </p>
            </div>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-[#0A1020]/70 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Inline preview isn&apos;t available for {badge} files
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Open in a new tab or download the file directly to view it.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B1222] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Browser
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download File
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}