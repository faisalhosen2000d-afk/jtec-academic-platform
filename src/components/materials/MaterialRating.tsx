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
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(stars: number) {
    setIsSaving(true);
    setMessage(null);

    const result = await saveMaterialRating({
      material_id: materialId,
      stars,
    });

    if (result.success) {
      setSelectedRating(stars);
      setMessage("Rating saved.");
    } else {
      setMessage(result.error);
    }

    setIsSaving(false);
  }

  async function handleDelete() {
    setIsSaving(true);
    setMessage(null);

    const result = await deleteMaterialRating(materialId);

    if (result.success) {
      setSelectedRating(null);
      setMessage("Rating removed.");
    } else {
      setMessage(result.error);
    }

    setIsSaving(false);
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Rating
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {averageRating.toFixed(2)} / 5 · {ratingCount}{" "}
            {ratingCount === 1 ? "rating" : "ratings"}
          </p>
        </div>

        <div className="flex items-center gap-1" aria-label="Rate this material">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleSave(star)}
              disabled={isSaving}
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              className={`text-2xl leading-none transition ${
                selectedRating !== null && star <= selectedRating
                  ? "text-yellow-500"
                  : "text-muted-foreground/40 hover:text-yellow-400"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {selectedRating !== null && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Your rating: {selectedRating}/5
          </p>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          >
            Remove rating
          </button>
        </div>
      )}

      {message && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}