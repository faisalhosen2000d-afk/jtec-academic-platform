"use client";

import { useState } from "react";
import { Pencil, Share2 } from "lucide-react";
import { saveProfileContacts } from "@/server/actions/profile-contacts";

type ContactValues = {
  email: string;
  phone: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  telegram: string;
};

type StudentContactSettingsProps = {
  initialValues: ContactValues;
};

const fields: Array<{
  name: keyof ContactValues;
  label: string;
  placeholder: string;
  type?: string;
}> = [
  {
    name: "email",
    label: "Contact Email",
    placeholder: "example@email.com",
    type: "email",
  },
  {
    name: "phone",
    label: "Phone",
    placeholder: "+8801XXXXXXXXX",
  },
  {
    name: "whatsapp",
    label: "WhatsApp",
    placeholder: "WhatsApp number or link",
  },
  {
    name: "facebook",
    label: "Facebook",
    placeholder: "Facebook profile link",
  },
  {
    name: "instagram",
    label: "Instagram",
    placeholder: "Instagram profile link",
  },
  {
    name: "linkedin",
    label: "LinkedIn",
    placeholder: "LinkedIn profile link",
  },
  {
    name: "telegram",
    label: "Telegram",
    placeholder: "Telegram username or link",
  },
];

export default function StudentContactSettings({
  initialValues,
}: StudentContactSettingsProps) {
  const [values, setValues] = useState<ContactValues>(initialValues);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const hasSavedInformation = Object.values(initialValues).some(
    (value) => value.trim().length > 0,
  );

  const [editing, setEditing] = useState(!hasSavedInformation);

  function updateField(name: keyof ContactValues, value: string) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleEdit() {
    setStatus("");
    setEditing(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      formData.set(key, value);
    });

    const result = await saveProfileContacts(formData);

    if (result.success) {
      setStatus("Contact information saved successfully.");
      setEditing(false);
    } else {
      setStatus(result.error);
    }

    setSaving(false);
  }

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 sm:p-6 shadow-xl transition-all duration-200 hover:border-cyan-500/35">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <Share2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-white sm:text-lg">
              Contact Information
            </h2>
            <p className="text-xs text-slate-400">
              Visible to classmates when you share study materials.
            </p>
          </div>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0E172A] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={`contact-${field.name}`}
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                {field.label}
              </label>

              <input
                id={`contact-${field.name}`}
                type={field.type ?? "text"}
                value={values[field.name]}
                onChange={(event) =>
                  updateField(field.name, event.target.value)
                }
                placeholder={field.placeholder}
                disabled={!editing || saving}
                className="h-10 w-full rounded-xl border border-slate-800 bg-[#0E172A] px-3.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-75"
              />
            </div>
          ))}
        </div>

        {editing && (
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Contact Information"}
            </button>

            {!hasSavedInformation && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-xl border border-slate-700 bg-[#0E172A] px-5 py-2.5 text-xs font-semibold text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            )}
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
    </section>
  );
}