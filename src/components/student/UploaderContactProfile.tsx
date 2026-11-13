"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, Mail, Phone } from "lucide-react";
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
  department_name?: string | null;
};

type UploaderContactProfileProps = {
  profile: ContactProfile;
  materialId: string;
  departmentName?: string | null;
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

function getDepartmentBadge(deptName?: string | null) {
  if (!deptName) return null;
  const t = deptName.toUpperCase();

  if (t.includes("APPAREL") || t.includes("AE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-purple-500/35 bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold text-purple-300">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        AE • Apparel
      </span>
    );
  }

  if (t.includes("WET") || t.includes("WPE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
        WPE • Wet Process
      </span>
    );
  }

  if (t.includes("FABRIC") || t.includes("FE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        FE • Fabric
      </span>
    );
  }

  if (t.includes("YARN") || t.includes("YE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        YE • Yarn
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] font-bold text-slate-300">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      {deptName}
    </span>
  );
}

function getContactIcon(key: ContactKey) {
  switch (key) {
    case "email":
      return <Mail className="h-3.5 w-3.5 text-rose-500" />;
    case "phone":
      return <Phone className="h-3.5 w-3.5 text-emerald-500" />;
    case "whatsapp":
      return (
        <svg className="h-3.5 w-3.5 fill-[#25D366]" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      );
    case "facebook":
      return (
        <svg className="h-3.5 w-3.5 fill-[#1877F2]" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case "instagram":
      return (
        <svg className="h-3.5 w-3.5 fill-[#E4405F]" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    case "linkedin":
      return (
        <svg className="h-3.5 w-3.5 fill-[#0A66C2]" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      );
    case "telegram":
      return (
        <svg className="h-3.5 w-3.5 fill-[#229ED9]" viewBox="0 0 24 24">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.946z"/>
        </svg>
      );
    default:
      return <Mail className="h-3.5 w-3.5 text-zinc-400" />;
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
  departmentName,
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

  const deptBadge = getDepartmentBadge(departmentName || profile.department_name);

  const modalContent = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-2xl border border-emerald-500/25 bg-[#0A1020] p-5 text-slate-100 shadow-[0_24px_64px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Profile Card with Department Badge */}
        <div className="flex items-center justify-between border-b border-slate-800/90 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-emerald-500/35"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 text-sm font-bold text-emerald-300">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-serif text-base font-bold leading-tight text-white">
                  {profile.full_name}
                </h3>
                {deptBadge}
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                Contributor Contact
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-xl border border-slate-800 bg-[#0E172A] p-1.5 text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contact Methods List */}
        <div className="mt-4 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Contact &amp; Social
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
                className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-800/90 bg-[#0E172A] px-3 py-2.5 transition-colors hover:border-slate-700"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-[#0A1020]">
                    {getContactIcon(key)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase leading-none text-slate-400">
                      {label}
                    </span>
                    {isLink ? (
                      <a
                        href={destination}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate text-xs font-medium text-slate-100 hover:text-emerald-300 hover:underline"
                        title={value}
                      >
                        {value}
                      </a>
                    ) : (
                      <span
                        className="mt-1 block truncate text-xs font-medium text-slate-100"
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
        <div className="mt-4 border-t border-slate-800/90 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Direct Message
          </p>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write a message to this student..."
            maxLength={2000}
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-[#0E172A] p-3 text-xs text-slate-100 placeholder:text-slate-500 transition outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          />

          <button
            type="button"
            disabled={sending || !message.trim()}
            onClick={handleSubmit}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-400 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending..." : "Send Message"}
          </button>

          {status && (
            <p
              className={`mt-2 text-center text-xs font-medium ${
                status.includes("success")
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  ) : null;

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
            className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-700"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-200">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">Uploaded by</p>
          <p className="truncate text-sm font-semibold text-slate-100">
            {profile.full_name}
          </p>
        </div>
      </button>

      {typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}