"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Full Name
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            You can update your full name without changing your academic records.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={handleEdit}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="student-full-name"
            className="text-sm font-medium text-foreground"
          >
            Your Full Name
          </label>

          <input
            id="student-full-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            maxLength={120}
            required
            disabled={!editing || saving}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-80"
          />

          {editing && (
            <p className="mt-1 text-xs text-muted-foreground">
              Maximum 120 characters.
            </p>
          )}
        </div>

        {editing && (
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {status && (
          <p
            className="text-sm text-muted-foreground"
            aria-live="polite"
          >
            {status}
          </p>
        )}
      </form>
    </section>
  );
}
