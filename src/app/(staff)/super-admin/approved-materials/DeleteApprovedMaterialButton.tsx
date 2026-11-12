"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  deleteApprovedMaterial,
  type DeleteApprovedMaterialResult,
} from "@/server/actions/material-delete";

type DeleteApprovedMaterialButtonProps = {
  materialId: string;
  title?: string;
};

export default function DeleteApprovedMaterialButton({
  materialId,
  title,
}: DeleteApprovedMaterialButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        setIsModalOpen(false);
        setError(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isModalOpen, isDeleting]);

  function openModal() {
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isDeleting) return;
    setError(null);
    setIsModalOpen(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const result: DeleteApprovedMaterialResult =
        await deleteApprovedMaterial(materialId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (deleteError) {
      console.error("Approved material deletion error:", deleteError);
      setError("Material could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 text-xs font-semibold text-rose-300 transition-all duration-150 hover:border-rose-400 hover:bg-rose-500/25 active:scale-95"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Delete Material</span>
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-500/35 bg-[#0A1020] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-material-title"
            aria-describedby="delete-material-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="delete-material-title"
                  className="font-serif text-lg font-bold text-white"
                >
                  Delete Material?
                </h2>

                {title ? (
                  <p className="mt-1 truncate text-xs font-semibold text-rose-300">
                    {title}
                  </p>
                ) : null}

                <p
                  id="delete-material-description"
                  className="mt-2 text-xs leading-relaxed text-slate-400"
                >
                  This action will permanently delete the approved material, its
                  database record, and its uploaded file. This action cannot be
                  undone.
                </p>
              </div>
            </div>

            {error && (
              <div
                className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-300"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isDeleting}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 text-xs font-semibold text-slate-300 transition-all hover:border-slate-500 hover:text-white active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-4 text-xs font-bold text-white shadow-[0_0_16px_rgba(244,63,94,0.35)] transition-all hover:from-rose-400 hover:to-rose-500 active:scale-95 disabled:opacity-60"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>{isDeleting ? "Deleting..." : "Delete Material"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}