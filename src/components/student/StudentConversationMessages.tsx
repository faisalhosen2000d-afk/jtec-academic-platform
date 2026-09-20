"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markMessageAsRead } from "@/server/actions/profile-messages";

type ConversationMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  material_id: string | null;
};

type StudentConversationMessagesProps = {
  messages: ConversationMessage[];
  currentUserId: string;
  materialTitleById: Map<string, string>;
};

export function StudentConversationMessages({
  messages,
  currentUserId,
  materialTitleById,
}: StudentConversationMessagesProps) {
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(
    () =>
      new Set(
        messages
          .filter((item) => item.sender_id === currentUserId || item.read_at !== null)
          .map((item) => item.id),
      ),
  );
  const [isPending, startTransition] = useTransition();

  const handleMessageClick = (messageId: string) => {
    const message = messages.find((item) => item.id === messageId);

    if (!message || message.sender_id === currentUserId || message.read_at !== null) {
      return;
    }

    if (readMessageIds.has(messageId)) {
      return;
    }

    startTransition(async () => {
      const result = await markMessageAsRead(messageId);

      if (!result.success) {
        return;
      }

      setReadMessageIds((current) => {
        const next = new Set(current);
        next.add(messageId);
        return next;
      });
    });
  };

  return (
    <div className="space-y-4">
      {messages.map((item) => {
        const isMine = item.sender_id === currentUserId;
        const isUnread = !isMine && !readMessageIds.has(item.id);

        return (
          <div
            key={item.id}
            className={`flex ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            <button
              type="button"
              onClick={() => handleMessageClick(item.id)}
              disabled={isPending && isUnread}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-left ${
                isMine
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p
                className={`whitespace-pre-wrap break-words text-sm ${
                  isUnread ? "font-semibold" : "font-normal"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{item.message}</span>
                  {isUnread ? (
                    <span
                      aria-label="Unread message"
                      className="inline-block h-2 w-2 rounded-full bg-destructive"
                    />
                  ) : null}
                </span>
              </p>

              {item.material_id ? (
                <Link
                  href={`/materials/${item.material_id}`}
                  onClick={(event) => event.stopPropagation()}
                  className={`mt-2 block rounded-lg border px-3 py-2 text-xs hover:underline ${
                    isMine
                      ? "border-primary-foreground/30 text-primary-foreground"
                      : "border-border text-foreground"
                  }`}
                >
                  <span className="font-medium">Material:</span>{" "}
                  {materialTitleById.get(item.material_id) ?? "Referenced material"}
                </Link>
              ) : null}

              <p suppressHydrationWarning
                className={`mt-1 text-xs ${
                  isMine
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {new Date(item.created_at).toLocaleString()}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}




