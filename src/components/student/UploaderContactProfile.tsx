"use client";

import { useState } from "react";
import { sendProfileMessage } from "@/server/actions/profile-messages";
import ContactMethodQr from "./ContactMethodQr";

type ContactProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  telegram: string | null;
};

type UploaderContactProfileProps = {
  profile: ContactProfile;
};

const contactFields = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "telegram", label: "Telegram" },
] as const;

type ContactKey = (typeof contactFields)[number]["key"];

function getContactDestination(key: ContactKey, value: string) {
  const trimmedValue = value.trim();

  if (/^[a-z][a-z\d+\-.]*:/i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (key === "email") {
    return `mailto:${trimmedValue}`;
  }

  if (key === "phone") {
    return `tel:${trimmedValue}`;
  }

  if (key === "whatsapp") {
    const digits = trimmedValue.replace(/[^\d]/g, "");
    const internationalDigits = digits.startsWith("0")
      ? `880${digits.slice(1)}`
      : digits.startsWith("880")
        ? digits
        : digits;

    return internationalDigits
      ? `https://wa.me/${internationalDigits}`
      : trimmedValue;
  }

  if (key === "facebook") {
    return `https://facebook.com/${trimmedValue.replace(/^@/, "")}`;
  }

  if (key === "instagram") {
    return `https://instagram.com/${trimmedValue.replace(/^@/, "")}`;
  }

  if (key === "linkedin") {
    return trimmedValue.startsWith("in/")
      ? `https://linkedin.com/${trimmedValue}`
      : `https://linkedin.com/in/${trimmedValue.replace(/^@/, "")}`;
  }

  if (key === "telegram") {
    return `https://t.me/${trimmedValue.replace(/^@/, "")}`;
  }

  return trimmedValue;
}

export default function UploaderContactProfile({
  profile,
}: UploaderContactProfileProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    setSending(true);
    setStatus("");

    const formData = new FormData();
    formData.set("recipient_id", profile.id);
    formData.set("message", message);

    const result = await sendProfileMessage(formData);

    if (result.success) {
      setMessage("");
      setStatus("Message sent successfully.");
    } else {
      setStatus(result.error);
    }

    setSending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 text-left"
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Uploaded by</p>
          <p className="truncate text-sm font-medium text-foreground">
            {profile.full_name}
          </p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Contact Profile
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.full_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {contactFields.map(({ key, label }) => {
                const value = profile[key];

                if (!value) {
                  return null;
                }

                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {label}
                        </p>

                        <p className="mt-1 break-words text-sm text-foreground">
                          {value}
                        </p>
                      </div>

                      <ContactMethodQr
                        label={label}
                        value={value}
                        destination={getContactDestination(key, value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-foreground">
                Send a Message
              </h3>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message..."
                maxLength={2000}
                rows={4}
                className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />

              <button
                type="button"
                disabled={sending || !message.trim()}
                onClick={handleSubmit}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>

              {status && (
                <p className="mt-3 text-sm text-muted-foreground">{status}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
