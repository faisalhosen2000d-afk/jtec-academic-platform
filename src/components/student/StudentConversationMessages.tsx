"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BookOpen } from "lucide-react";
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
    <div className="space-y-3.5">
      {messages.map((item) => {
        const isMine = item.sender_id === currentUserId;
        const isUnread = !isMine && !readMessageIds.has(item.id);

        return (
          <div
            key={item.id}
            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
          >
            <button
              type="button"
              onClick={() => handleMessageClick(item.id)}
              disabled={isPending && isUnread}
              className={`max-w-[85%] rounded-2xl border px-4 py-3 text-left transition ${
                isMine
                  ? "rounded-br-sm border-emerald-500/35 bg-emerald-500/15 text-emerald-50"
                  : "rounded-bl-sm border-slate-800 bg-[#0E172A] text-slate-100"
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
                      className="inline-block h-2 w-2 rounded-full bg-cyan-400"
                    />
                  ) : null}
                </span>
              </p>

              {item.material_id ? (
                <Link
                  href={`/materials/${item.material_id}`}
                  onClick={(event) => event.stopPropagation()}
                  className={`mt-2.5 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition hover:underline ${
                    isMine
                      ? "border-emerald-400/35 bg-[#0A1020]/60 text-emerald-200"
                      : "border-slate-700/80 bg-[#0A1020] text-cyan-300"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-semibold">Material:</span>{" "}
                  <span className="truncate">
                    {materialTitleById.get(item.material_id) ?? "Referenced material"}
                  </span>
                </Link>
              ) : null}

              <p
                suppressHydrationWarning
                className={`mt-1.5 text-[11px] ${
                  isMine ? "text-emerald-300/70" : "text-slate-400"
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