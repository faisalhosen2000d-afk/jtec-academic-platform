"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendProfileMessage } from "@/server/actions/profile-messages";

type StudentConversationReplyProps = {
  recipientId: string;
};

export function StudentConversationReply({
  recipientId,
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

      {status && (
        <p className="mt-3 text-sm text-muted-foreground">
          {status}
        </p>
      )}
    </section>
  );
}
