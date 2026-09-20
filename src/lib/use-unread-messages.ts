"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

let hasUnreadMessages = false;
let inFlightRequest: Promise<void> | undefined;
const listeners = new Set<(value: boolean) => void>();

function publish(value: boolean) {
  hasUnreadMessages = value;
  listeners.forEach((listener) => listener(value));
}

async function refreshUnreadMessages() {
  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      publish(false);
      return;
    }

    const { count, error } = await supabase
      .from("profile_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", session.user.id)
      .is("read_at", null)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error) {
      console.error("Unread message check failed:", error);
      return;
    }

    publish((count ?? 0) > 0);
  })().finally(() => {
    inFlightRequest = undefined;
  });

  return inFlightRequest;
}

export function useUnreadMessages(revalidateKey: string) {
  const [hasUnread, setHasUnread] = useState(hasUnreadMessages);

  useEffect(() => {
    listeners.add(setHasUnread);
    setHasUnread(hasUnreadMessages);
    void refreshUnreadMessages();

    const handleMessageRead = () => {
      void refreshUnreadMessages();
    };

    window.addEventListener("jtec-message-read", handleMessageRead);

    return () => {
      listeners.delete(setHasUnread);
      window.removeEventListener("jtec-message-read", handleMessageRead);
    };
  }, [revalidateKey]);

  return hasUnread;
}
