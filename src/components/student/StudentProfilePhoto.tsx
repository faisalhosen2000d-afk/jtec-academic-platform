"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveProfilePhoto } from "@/server/actions/profile-photo";

type StudentProfilePhotoProps = {
  userId: string;
  fullName: string;
  initialAvatarUrl: string | null;
};

export default function StudentProfilePhoto({
  userId,
  fullName,
  initialAvatarUrl,
}: StudentProfilePhotoProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setStatus("");
    setSelectedFile(null);

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("Please select a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus("Profile photo cannot exceed 5 MB.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setStatus("Please select a photo first.");
      return;
    }

    setUploading(true);
    setStatus("");

    try {
      const supabase = createClient();

      const fileExtension =
        selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${userId}/avatar-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const result = await saveProfilePhoto(data.publicUrl);

      if (!result.success) {
        throw new Error(result.error);
      }

      setAvatarUrl(data.publicUrl);
      setSelectedFile(null);
      setStatus("Profile photo updated successfully.");
    } catch (error) {
      console.error("Profile photo upload error:", error);

      setStatus(
        error instanceof Error
          ? error.message
          : "Profile photo could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${fullName} profile`}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-muted"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground ring-4 ring-muted"
            aria-label={`${fullName} profile placeholder`}
          >
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-xl font-semibold text-foreground">
            Profile Photo
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Use a clear JPG, PNG, or WebP image. Maximum size: 5 MB.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
            <label className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              Choose Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Photo"}
            </button>
          </div>

          {selectedFile && (
            <p className="mt-3 text-xs text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}

          {status && (
            <p
              className="mt-3 text-sm text-muted-foreground"
              aria-live="polite"
            >
              {status}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
