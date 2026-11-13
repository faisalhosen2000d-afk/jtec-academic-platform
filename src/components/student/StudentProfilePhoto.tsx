"use client";

import { useState } from "react";
import { Camera, UploadCloud } from "lucide-react";
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
    <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 sm:p-6 shadow-xl transition-all duration-200 hover:border-emerald-500/35">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${fullName} profile`}
            className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-emerald-500/40"
          />
        ) : (
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-emerald-500/35 bg-[#0E172A] text-2xl font-bold text-emerald-300"
            aria-label={`${fullName} profile placeholder`}
          >
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="font-serif text-base font-bold text-white sm:text-lg">
            Profile Photo
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Use a clear JPG, PNG, or WebP image. Maximum size: 5 MB.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:justify-start">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0E172A] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300">
              <Camera className="h-3.5 w-3.5" />
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload Photo"}
            </button>
          </div>

          {selectedFile && (
            <p className="mt-2.5 text-xs text-cyan-300">
              Selected: {selectedFile.name}
            </p>
          )}

          {status && (
            <p
              className={`mt-2.5 text-xs font-medium ${
                status.includes("success") ? "text-emerald-400" : "text-rose-400"
              }`}
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