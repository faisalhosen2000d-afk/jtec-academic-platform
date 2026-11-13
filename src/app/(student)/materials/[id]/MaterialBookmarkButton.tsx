"use client";

import { useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { toggleMaterialBookmark } from "@/server/actions/material-bookmarks";

type MaterialBookmarkButtonProps = {
  materialId: string;
  initialBookmarked: boolean;
  variant?: "default" | "icon";
};

export default function MaterialBookmarkButton({
  materialId,
  initialBookmarked,
  variant = "default",
}: MaterialBookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setLoading(true);
    setError("");

    try {
      const result = await toggleMaterialBookmark(materialId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBookmarked(result.bookmarked);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Bookmark could not be updated."
      );
    } finally {
      setLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={bookmarked}
        title={bookmarked ? "Remove bookmark" : "Bookmark material"}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
          bookmarked
            ? "border-amber-400/40 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
            : "border-slate-700/80 bg-[#0D1526] text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={bookmarked}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
          bookmarked
            ? "border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
            : "border-slate-700/80 bg-[#0D1526] text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
        )}
        {loading ? "Saving..." : bookmarked ? "Bookmarked" : "Bookmark"}
      </button>

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}