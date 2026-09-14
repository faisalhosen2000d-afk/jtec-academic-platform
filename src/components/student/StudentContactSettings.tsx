"use client";

import { useState } from "react";
import { saveProfileContacts } from "@/server/actions/profile-contacts";

type ContactValues = {
  email: string;
  phone: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  linkedin: string;
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
];

export default function StudentContactSettings({
  initialValues,
}: StudentContactSettingsProps) {
  const [values, setValues] = useState<ContactValues>(initialValues);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(name: keyof ContactValues, value: string) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
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
    } else {
      setStatus(result.error);
    }

    setSaving(false);
  }

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Contact Information
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Add the contact information you want other students to see.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={`contact-${field.name}`}
                className="text-sm font-medium text-foreground"
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
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Contact Information"}
        </button>

        {status && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {status}
          </p>
        )}
      </form>
    </section>
  );
}
