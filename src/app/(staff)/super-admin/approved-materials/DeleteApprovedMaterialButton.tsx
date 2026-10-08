"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  deleteApprovedMaterial,
  type DeleteApprovedMaterialResult,
} from "@/server/actions/material-delete";

type DeleteApprovedMaterialButtonProps = {
  materialId: string;
};

export default function DeleteApprovedMaterialButton({
  materialId,
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

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
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
      <Button type="button" variant="outline" onClick={openModal}>
        Delete Material
      </Button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-material-title"
            aria-describedby="delete-material-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 3.8 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.2a2 2 0 0 0-3.4 0Z" />
                </svg>
              </div>

              <div className="min-w-0">
                <h2
                  id="delete-material-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Delete Material?
                </h2>

                <p
                  id="delete-material-description"
                  className="mt-2 text-sm leading-6 text-muted-foreground"
                >
                  This action will permanently delete the approved material,
                  its database record, and its uploaded file. This action
                  cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <div
                className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isDeleting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {isDeleting ? "Deleting..." : "Delete Material"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}