"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteStudentAccounts,
  type UserActionResult,
} from "@/app/(staff)/super-admin/users/actions";

type BulkDeleteStudentsButtonProps = {
  selectedStudentIds: string[];
  onDeleted: () => void;
};

export default function BulkDeleteStudentsButton({
  selectedStudentIds,
  onDeleted,
}: BulkDeleteStudentsButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<UserActionResult | null>(null);

  const selectedCount = selectedStudentIds.length;

  function openModal() {
    if (selectedCount === 0) return;
    setResult(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (!isPending) {
      setIsModalOpen(false);
      setResult(null);
    }
  }

  function handleDelete() {
    setResult(null);

    startTransition(async () => {
      const response = await deleteStudentAccounts(selectedStudentIds);
      setResult(response);

      if (response.success) {
        setIsModalOpen(false);
        onDeleted();
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={selectedCount === 0 || isPending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete Selected
        {selectedCount > 0 ? ` (${selectedCount})` : ""}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-students-title"
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
          >
            <h2
              id="bulk-delete-students-title"
              className="text-xl font-semibold text-foreground"
            >
              Delete Selected Students?
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You are about to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {selectedCount} student account
                {selectedCount === 1 ? "" : "s"}
              </span>
              .
            </p>

            <p className="mt-2 text-sm leading-6 text-red-600">
              This action cannot be undone.
            </p>

            {result && !result.success && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {result.error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
