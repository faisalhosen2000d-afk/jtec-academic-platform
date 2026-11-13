"use client";

import { useState } from "react";
import {
  deleteMaterialRating,
  saveMaterialRating,
} from "@/server/actions/material-ratings";

type MaterialRatingProps = {
  materialId: string;
  initialRating: number | null;
  averageRating: number;
  ratingCount: number;
};

export default function MaterialRating({
  materialId,
  initialRating,
  averageRating,
  ratingCount,
}: MaterialRatingProps) {
  const [selectedRating, setSelectedRating] = useState(initialRating);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  async function handleSave(stars: number) {
    setIsSaving(true);
    setMessage(null);

    const result = await saveMaterialRating({
      material_id: materialId,
      stars,
    });

    if (result.success) {
      setSelectedRating(stars);
      setMessage({ text: "Rating saved." });
    } else {
      setMessage({ text: result.error, isError: true });
    }

    setIsSaving(false);
  }

  async function handleDelete() {
    setIsSaving(true);
    setMessage(null);

    const result = await deleteMaterialRating(materialId);

    if (result.success) {
      setSelectedRating(null);
      setMessage({ text: "Rating removed." });
    } else {
      setMessage({ text: result.error, isError: true });
    }

    setIsSaving(false);
  }

  const activeThreshold = hoveredStar ?? selectedRating ?? 0;

  return (
    <div className="rounded-xl border border-slate-800/90 bg-[#0E172A]/80 p-4 sm:p-5 transition-all duration-200 hover:border-amber-500/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            Material Rating
          </p>

          <p className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-slate-400">
            <span className="font-semibold text-amber-300">
              {averageRating.toFixed(2)} / 5
            </span>
            <span className="text-slate-600">&middot;</span>
            <span>
              {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
            </span>
          </p>
        </div>

        <div
          className="flex items-center gap-1.5"
          aria-label="Rate this material"
          onMouseLeave={() => setHoveredStar(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= activeThreshold;
            return (
              <button
                key={star}
                type="button"
                onClick={() => handleSave(star)}
                onMouseEnter={() => setHoveredStar(star)}
                disabled={isSaving}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                className={`rounded-lg p-1 transition-all duration-150 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                    : "text-slate-600 hover:text-amber-300/80"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M12 2.25l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.32l-5.9 3.1 1.13-6.57L2.45 9.19l6.6-.96L12 2.25z" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRating !== null && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
            Your rating: {selectedRating}/5
          </span>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving}
            className="text-xs font-medium text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-rose-300 hover:decoration-rose-400 disabled:opacity-50"
          >
            Remove rating
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-xs font-medium ${
            message.isError ? "text-rose-300" : "text-emerald-300"
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}