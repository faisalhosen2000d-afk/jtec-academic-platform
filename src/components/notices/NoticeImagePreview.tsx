"use client";

import { useEffect, useState } from "react";

type NoticeImagePreviewProps = {
  attachmentId: string;
  fileName: string;
};

export function NoticeImagePreview({
  attachmentId,
  fileName,
}: NoticeImagePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      try {
        const response = await fetch("/api/notices/attachment-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attachmentId,
            action: "open",
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.url) {
          throw new Error(
            result.error || "Unable to load this image.",
          );
        }

        if (!cancelled) {
          setUrl(result.url);
        }
      } catch (imageError) {
        console.error("Notice image loading error:", imageError);

        if (!cancelled) {
          setError(
            imageError instanceof Error
              ? imageError.message
              : "Unable to load this image.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-muted/20">
        <p className="text-sm text-muted-foreground">
          Loading image...
        </p>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-destructive">
          {error || "Unable to load this image."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${fileName}`}
        className="block"
      >
        <img
          src={url}
          alt={fileName}
          className="mx-auto max-h-[700px] w-auto max-w-full object-contain"
        />
      </a>
    </div>
  );
}