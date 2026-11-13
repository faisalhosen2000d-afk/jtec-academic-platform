"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveProfilePhoto } from "@/server/actions/profile-photo";
import {
  updateStaffProfile,
  updateStaffPassword,
} from "@/app/(staff)/profile-actions";
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  Building2,
  Phone,
  DoorOpen,
  BookOpen,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Save,
  Camera,
  Loader2,
} from "lucide-react";

export interface StaffProfileData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department_name: string | null;
  designation: string | null;
  phone: string | null;
  office_room: string | null;
  specialization: string | null;
  avatar_url?: string | null;
  created_at: string;
}

const DESIGNATION_SUGGESTIONS = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Head of Department",
  "System Administrator",
  "Academic Moderator",
];

export function StaffProfileClient({
  profile,
  backHref,
  backLabel,
}: {
  profile: StaffProfileData;
  backHref: string;
  backLabel: string;
}) {
  const [isPendingProfile, startProfileTransition] = useTransition();
  const [isPendingPassword, startPasswordTransition] = useTransition();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [designation, setDesignation] = useState(profile.designation || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [officeRoom, setOfficeRoom] = useState(profile.office_room || "");
  const [specialization, setSpecialization] = useState(
    profile.specialization || ""
  );

  const [profileStatus, setProfileStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const initials = (fullName || profile.email || "AD")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    profile.role === "super_admin"
      ? "Super Administrator"
      : profile.role === "admin"
        ? "Faculty Administrator"
        : "Academic Moderator";

  const scopeDescription =
    profile.role === "super_admin"
      ? "Global Institutional Access • All Departments, Academic Structure, Audit Logs & System Settings"
      : `Departmental Administration • ${profile.department_name || "All Assigned Scopes"} (Verification, Materials, Results & Notices)`;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoStatus(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoStatus({ type: "error", text: "Please select a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoStatus({ type: "error", text: "Profile photo cannot exceed 5 MB." });
      return;
    }
    setUploadingPhoto(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
      const res = await saveProfilePhoto(data.publicUrl);
      if (!res.success) throw new Error(res.error);
      setAvatarUrl(data.publicUrl);
      setPhotoStatus({ type: "success", text: "Profile photo updated!" });
    } catch (err) {
      setPhotoStatus({
        type: "error",
        text: err instanceof Error ? err.message : "Could not upload photo.",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileStatus(null);
    const fd = new FormData(e.currentTarget);
    startProfileTransition(async () => {
      const res = await updateStaffProfile(fd);
      setProfileStatus({
        type: res.success ? "success" : "error",
        text: res.message,
      });
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordStatus(null);
    const fd = new FormData(e.currentTarget);
    startPasswordTransition(async () => {
      const res = await updateStaffPassword(fd);
      setPasswordStatus({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      if (res.success) {
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              Institutional Staff Account
            </span>
            <h1 className="font-serif text-xl font-bold text-white sm:text-2xl">
              Faculty &amp; Administration Profile
            </h1>
          </div>
          <Link
            href={backHref}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-500/50 hover:text-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Identity Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName || "Staff Avatar"}
                      className="h-24 w-24 rounded-2xl border-2 border-amber-500/50 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-slate-900 font-serif text-2xl font-bold text-amber-300 shadow-lg">
                      {initials}
                    </div>
                  )}
                  <label
                    htmlFor="staff-avatar-upload"
                    title="Upload profile photo"
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-amber-400/60 bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-all hover:bg-amber-400 active:scale-95"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      id="staff-avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {photoStatus ? (
                  <p className={`mt-3 text-[11px] font-semibold ${photoStatus.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                    {photoStatus.text}
                  </p>
                ) : null}
                <h2 className="mt-4 font-serif text-xl font-bold text-white">
                  {fullName || "Administrator"}
                </h2>
                <p className="mt-1 text-xs font-medium text-amber-400">
                  {designation || "Designation Not Set"}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {roleLabel}
                </span>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-800/80 pt-5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    Email
                  </span>
                  <span className="truncate font-medium text-slate-200">
                    {profile.email}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    Department
                  </span>
                  <span className="font-medium text-slate-200">
                    {profile.department_name ||
                      (profile.role === "super_admin"
                        ? "Central Administration"
                        : "Assigned Scope")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    Joined
                  </span>
                  <span className="font-medium text-slate-200">
                    {new Date(profile.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Permission Scope
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {scopeDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Profile Edit & Security */}
          <div className="lg:col-span-8 space-y-6">
            {/* Faculty Information Form */}
            <form
              onSubmit={handleProfileSubmit}
              className="rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-xl space-y-5"
            >
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="font-serif text-lg font-bold text-white">
                  Personal &amp; Academic Details
                </h3>
                <p className="text-xs text-slate-400">
                  Keep your institutional title, contact, and specialization up to date.
                </p>
              </div>

              {profileStatus && (
                <div
                  className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs ${
                    profileStatus.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {profileStatus.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{profileStatus.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <User className="h-3.5 w-3.5 text-amber-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Engr. Md. ..."
                    className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Briefcase className="h-3.5 w-3.5 text-amber-400" />
                    Academic Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    list="designation-options"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Lecturer / Assistant Professor"
                    className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  <datalist id="designation-options">
                    {DESIGNATION_SUGGESTIONS.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-sky-400" />
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +880 1XXX-XXXXXX"
                    className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <DoorOpen className="h-3.5 w-3.5 text-emerald-400" />
                    Office Room / Desk
                  </label>
                  <input
                    type="text"
                    name="office_room"
                    value={officeRoom}
                    onChange={(e) => setOfficeRoom(e.target.value)}
                    placeholder="e.g. Academic Building, Room 304"
                    className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                  Courses Taught / Specialization
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Yarn Manufacturing, Wet Processing, Garment Merchandising"
                  className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPendingProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {isPendingProfile ? "Saving Changes..." : "Save Profile Changes"}
                  </span>
                </button>
              </div>
            </form>

            {/* Security & Password Change Form */}
            <form
              onSubmit={handlePasswordSubmit}
              className="rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-xl space-y-5"
            >
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="font-serif text-lg font-bold text-white">
                  Account Security &amp; Password
                </h3>
                <p className="text-xs text-slate-400">
                  Update your staff login password (minimum 8 characters).
                </p>
              </div>

              {passwordStatus && (
                <div
                  className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs ${
                    passwordStatus.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {passwordStatus.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{passwordStatus.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Lock className="h-3.5 w-3.5 text-rose-400" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      name="new_password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 pl-3.5 pr-10 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400"
                    >
                      {showNewPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Lock className="h-3.5 w-3.5 text-rose-400" />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      name="confirm_password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950 pl-3.5 pr-10 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400"
                    >
                      {showConfirmPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPendingPassword}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-5 py-2.5 text-xs font-bold text-rose-200 transition-all hover:bg-rose-500/25 disabled:opacity-60 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>
                    {isPendingPassword ? "Updating..." : "Update Password"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}