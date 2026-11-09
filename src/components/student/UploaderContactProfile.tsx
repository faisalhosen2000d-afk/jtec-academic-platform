"use client";

import { useState, useEffect } from "react";
import { X, Send, Mail, Phone, MessageCircle, Globe, Share2 } from "lucide-react";
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

function getContactIcon(key: ContactKey) {
  switch (key) {
    case "email":
      return <Mail className="h-3.5 w-3.5 text-rose-500" />;
    case "phone":
      return <Phone className="h-3.5 w-3.5 text-emerald-500" />;
    case "whatsapp":
      return <MessageCircle className="h-3.5 w-3.5 text-green-500" />;
    case "facebook":
      return <Globe className="h-3.5 w-3.5 text-blue-500" />;
    case "instagram":
      return <Share2 className="h-3.5 w-3.5 text-pink-500" />;
    case "linkedin":
      return <Globe className="h-3.5 w-3.5 text-sky-600" />;
    case "telegram":
      return <Send className="h-3.5 w-3.5 text-sky-500" />;
    default:
      return <Globe className="h-3.5 w-3.5 text-zinc-400" />;
  }
}

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[82vh] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Profile Card */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3.5">
              <div className="flex items-center gap-3 min-w-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/20 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-xs">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {profile.full_name}
                  </h3>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Contributor Contact
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 shrink-0"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contact Methods List */}
            <div className="mt-3.5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Contact & Social
              </p>

              {contactFields.map(({ key, label }) => {
                const value = profile[key];
                if (!value) return null;

                const destination = getContactDestination(key, value);
                const isLink =
                  destination.startsWith("http") ||
                  destination.startsWith("mailto:") ||
                  destination.startsWith("tel:");

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-800/40 px-3 py-2 transition-colors hover:border-zinc-200 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 shadow-xs border border-zinc-100 dark:border-zinc-700/60">
                        {getContactIcon(key)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold uppercase leading-none text-zinc-400 dark:text-zinc-500">
                          {label}
                        </span>
                        {isLink ? (
                          <a
                            href={destination}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 block truncate text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                            title={value}
                          >
                            {value}
                          </a>
                        ) : (
                          <span
                            className="mt-0.5 block truncate text-xs font-medium text-zinc-800 dark:text-zinc-200"
                            title={value}
                          >
                            {value}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <ContactMethodQr
                        label={label}
                        value={value}
                        destination={destination}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Message */}
            <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Direct Message
              </p>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write a message to this student..."
                maxLength={2000}
                rows={2}
                className="mt-2 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/20"
              />

              <button
                type="button"
                disabled={sending || !message.trim()}
                onClick={handleSubmit}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {sending ? "Sending..." : "Send Message"}
              </button>

              {status && (
                <p
                  className={`mt-2 text-center text-xs font-medium ${
                    status.includes("success")
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
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