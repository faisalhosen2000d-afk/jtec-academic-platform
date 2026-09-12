"use client";

import { useState } from "react";

type NoticeAttachmentActionsProps = {
  attachmentId: string;
  showOpen?: boolean;
};

export function NoticeAttachmentActions({
  attachmentId,
  showOpen = true,
}: NoticeAttachmentActionsProps) {
  const [action, setAction] = useState<"open" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccess(requestedAction: "open" | "download") {
    if (action) {
      return;
    }

    setAction(requestedAction);
    setError(null);

    try {
      const response = await fetch("/api/notices/attachment-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attachmentId,
          action: requestedAction,
        }),
      });

      if (!response.ok) {
        let message = "Unable to access this attachment.";

        try {
          const result = await response.json();

          if (result?.error) {
            message = result.error;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      if (requestedAction === "open") {
        const result = await response.json();

        if (!result.success || !result.url) {
          throw new Error(
            result.error || "Unable to open this attachment.",
          );
        }

        window.open(
          result.url,
          "_blank",
          "noopener,noreferrer",
        );

        return;
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The downloaded attachment is empty.");
      }

      const contentDisposition = response.headers.get(
        "content-disposition",
      );

      let fileName = "Attachment";

      const fileNameMatch = contentDisposition?.match(
        /filename="([^"]+)"/i,
      );

      if (fileNameMatch?.[1]) {
        fileName = fileNameMatch[1];
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (accessError) {
      console.error("Notice attachment access error:", accessError);

      setError(
        accessError instanceof Error
          ? accessError.message
          : "Unable to access this attachment.",
      );
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showOpen && (
        <button
          type="button"
          onClick={() => handleAccess("open")}
          disabled={action !== null}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {action === "open" ? "Opening..." : "Open"}
        </button>
      )}

      <button
        type="button"
        onClick={() => handleAccess("download")}
        disabled={action !== null}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {action === "download" ? "Downloading..." : "Download"}
      </button>

      {error && (
        <p className="w-full text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}