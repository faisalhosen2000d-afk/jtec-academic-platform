"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">
        Reply
      </h2>

      {sentMessageCount >= 5 ? (
        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm font-medium text-foreground">
            You have reached your 5-message limit in this conversation.
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            You can continue communicating using the available contact methods below.
          </p>

          <div className="mt-4 space-y-3">
            {contactFields.map(({ key, label }) => {
              const value = contactProfile[key];

              if (!value) {
                return null;
              }

              return (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-3">
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
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your reply..."
            maxLength={2000}
            rows={4}
            disabled={sending}
            className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />

          <div className="mt-2 text-xs text-muted-foreground">
            {message.length}/2000 characters
          </div>

          <button
            type="button"
            disabled={sending || !message.trim()}
            onClick={handleSubmit}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </>
      )}

      {status && (
        <p className="mt-3 text-sm text-muted-foreground">
          {status}
        </p>
      )}
    </section>
  );
}
