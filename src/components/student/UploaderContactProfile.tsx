"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
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
  materialId: string;
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
  materialId,
}: UploaderContactProfileProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  // Escape চাপলে মোডাল বন্ধ হওয়া
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function handleSubmit() {
    setSending(true);
    setStatus("");

    const formData = new FormData();
    formData.set("recipient_id", profile.id);
    formData.set("material_id", materialId);
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
        className="flex items-center gap-3 text-left transition-opacity hover:opacity-85 focus:outline-none"
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-2 ring-primary/20">
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Contact Profile
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground">
                    {profile.full_name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contact Methods List */}
            <div className="mt-5 space-y-2.5">
              {contactFields.map(({ key, label }) => {
                const value = profile[key];
                if (!value) return null;

                const destination = getContactDestination(key, value);
                const isLink = destination.startsWith("http") || destination.startsWith("mailto:") || destination.startsWith("tel:");

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </p>
                        {isLink ? (
                          <a
                            href={destination}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 block truncate text-xs font-medium text-primary hover:underline"
                            title={value}
                          >
                            {value}
                          </a>
                        ) : (
                          <p className="mt-0.5 truncate text-xs font-medium text-foreground" title={value}>
                            {value}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        <ContactMethodQr
                          label={label}
                          value={value}
                          destination={destination}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Send a Message */}
            <div className="mt-6 border-t border-border/60 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Send a Message
              </h3>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message to this student..."
                maxLength={2000}
                rows={3}
                className="mt-2.5 w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="button"
                disabled={sending || !message.trim()}
                onClick={handleSubmit}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sending..." : "Send Message"}
              </button>

              {status && (
                <p className={`mt-2.5 text-center text-xs font-medium ${status.includes("success") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {status}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}