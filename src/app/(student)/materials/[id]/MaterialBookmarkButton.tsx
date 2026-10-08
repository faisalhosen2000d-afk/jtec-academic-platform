"use client";

import { useState } from "react";
import { toggleMaterialBookmark } from "@/server/actions/material-bookmarks";

type MaterialBookmarkButtonProps = {
  materialId: string;
  initialBookmarked: boolean;
};

export default function MaterialBookmarkButton({
  materialId,
  initialBookmarked,
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

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={bookmarked}
        className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Saving..."
          : bookmarked
            ? "✓ Bookmarked"
            : "🔖 Bookmark"}
      </button>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
