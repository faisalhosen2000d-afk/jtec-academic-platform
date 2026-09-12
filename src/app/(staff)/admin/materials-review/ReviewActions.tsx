"use client";

import { useState } from "react";

type ReviewActionsProps = {
  materialId: string;
};

type ModalType = "approve" | "reject" | null;

export default function ReviewActions({
  materialId,
}: ReviewActionsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(
    null,
  );
  const [modal, setModal] = useState<ModalType>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function closeModal() {
    if (loading !== null) return;

    setModal(null);
    setRejectionReason("");
    setError("");
  }

  async function handleApprove() {
    setLoading("approve");
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/materials/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve",
          materialId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to approve this material.",
        );
      }

      if (result?.escalated) {
        setSuccess(
          "Action escalated. It is now pending Super Admin review.",
        );
      } else {
        setSuccess("Material approved successfully.");
      }

      setModal(null);
      setRejectionReason("");

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve this material.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    const reason = rejectionReason.trim();

    if (!reason) {
      setError("Please enter a rejection reason.");
      return;
    }

    setLoading("reject");
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/materials/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
          materialId,
          rejectionReason: reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to reject this material.",
        );
      }

      if (result?.escalated) {
        setSuccess(
          "Action escalated. It is now pending Super Admin review.",
        );
      } else {
        setSuccess("Material rejected successfully.");
      }

      setModal(null);
      setRejectionReason("");

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reject this material.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setModal("approve");
            }}
            disabled={loading !== null}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Approve
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setRejectionReason("");
              setModal("reject");
            }}
            disabled={loading !== null}
            className="rounded-lg border border-red-300 bg-background px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}
      </div>

      {modal === "approve" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-material-title"
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
          >
            <h2
              id="approve-material-title"
              className="text-xl font-semibold text-foreground"
            >
              Approve Material?
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Are you sure you want to approve this material? Once approved,
              it can become available according to the material visibility
              rules.
            </p>

            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading !== null}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={loading !== null}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === "approve" ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-material-title"
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
          >
            <h2
              id="reject-material-title"
              className="text-xl font-semibold text-foreground"
            >
              Reject Material?
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Please provide a clear reason for rejecting this material.
            </p>

            <div className="mt-4">
              <label
                htmlFor={`rejection-${materialId}`}
                className="text-sm font-medium text-foreground"
              >
                Rejection Reason
              </label>

              <textarea
                id={`rejection-${materialId}`}
                value={rejectionReason}
                onChange={(event) => {
                  setRejectionReason(event.target.value);
                  setError("");
                }}
                placeholder="Explain why this material is being rejected..."
                rows={4}
                disabled={loading !== null}
                className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading !== null}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={
                  loading !== null ||
                  rejectionReason.trim().length === 0
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === "reject"
                  ? "Rejecting..."
                  : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}