"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateStudentFullName } from "@/server/actions/student-profile";

type StudentFullNameEditorProps = {
  initialName: string;
};

export default function StudentFullNameEditor({
  initialName,
}: StudentFullNameEditorProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function handleEdit() {
    setStatus("");
    setEditing(true);
  }

  function handleCancel() {
    setName(savedName);
    setStatus("");
    setEditing(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setStatus("");

    const formData = new FormData();
    formData.set("full_name", name);

    const result = await updateStudentFullName(formData);

    if (result.success) {
      const updatedName = name.trim();

      setName(updatedName);
      setSavedName(updatedName);
      setEditing(false);
      setStatus("Full name updated successfully.");

      router.refresh();
    } else {
      setStatus(result.error);
    }

    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0E172A] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">
            Full Name
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Update your display name without changing academic records.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0A1020] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            id="student-full-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            maxLength={120}
            required
            disabled={!editing || saving}
            className="h-10 w-full rounded-xl border border-slate-800 bg-[#0A1020] px-3.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-75"
          />

          {editing && (
            <p className="mt-1 text-[11px] text-slate-400">
              Maximum 120 characters.
            </p>
          )}
        </div>

        {editing && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-xl border border-slate-700 bg-[#0A1020] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {status && (
          <p
            className={`text-xs font-medium ${
              status.includes("success") ? "text-emerald-400" : "text-rose-400"
            }`}
            aria-live="polite"
          >
            {status}
          </p>
        )}
      </form>
    </div>
  );
}