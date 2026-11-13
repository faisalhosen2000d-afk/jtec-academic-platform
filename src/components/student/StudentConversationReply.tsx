"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { sendProfileMessage } from "@/server/actions/profile-messages";
import ContactMethodQr from "./ContactMethodQr";

type ContactProfile = {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  telegram: string | null;
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

type StudentConversationReplyProps = {
  recipientId: string;
  sentMessageCount: number;
  contactProfile: ContactProfile;
};

export function StudentConversationReply({
  recipientId,
  sentMessageCount,
  contactProfile,
}: StudentConversationReplyProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending) {
      return;
    }

    setSending(true);
    setStatus("");

    const formData = new FormData();
    formData.set("recipient_id", recipientId);
    formData.set("message", trimmedMessage);

    const result = await sendProfileMessage(formData);

    if (result.success) {
      setMessage("");
      setStatus("Message sent successfully.");
      router.refresh();
    } else {
      setStatus(result.error);
    }

    setSending(false);
  }

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 sm:p-6 shadow-xl transition-all duration-200 hover:border-cyan-500/35">
      <h2 className="font-serif text-base font-bold text-white">
        Reply
      </h2>

      {sentMessageCount >= 5 ? (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
          <p className="text-sm font-semibold text-amber-200">
            You have reached your 5-message limit in this conversation.
          </p>

          <p className="mt-1 text-xs text-slate-300">
            You can continue communicating using the available contact methods below.
          </p>

          <div className="mt-4 space-y-2.5">
            {contactFields.map(({ key, label }) => {
              const value = contactProfile[key];

              if (!value) {
                return null;
              }

              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-800 bg-[#0E172A] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                      </p>
                      <p className="mt-0.5 break-words text-xs sm:text-sm font-medium text-slate-100">
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
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your reply..."
            maxLength={2000}
            rows={3}
            disabled={sending}
            className="mt-3 w-full rounded-xl border border-slate-800 bg-[#0E172A] p-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15 disabled:opacity-60"
          />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {message.length}/2000 characters
            </span>

            <button
              type="button"
              disabled={sending || !message.trim()}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send Reply
                </>
              )}
            </button>
          </div>
        </>
      )}

      {status && (
        <p
          className={`mt-3 text-xs font-medium ${
            status.includes("success") ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {status}
        </p>
      )}
    </section>
  );
}