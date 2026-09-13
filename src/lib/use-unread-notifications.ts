"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

let hasUnreadNotifications = false;
let inFlightRequest: Promise<void> | undefined;
const listeners = new Set<(value: boolean) => void>();

function publish(value: boolean) {
  hasUnreadNotifications = value;
  listeners.forEach((listener) => listener(value));
}

/**
 * Header and sidebar are rendered together on every student route. Keeping
 * this request module-scoped lets both use the same in-flight query instead
 * of independently loading the same auth state and notification count.
 */
async function refreshUnreadNotifications() {
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
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", session.user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Unread notification check failed:", error);
      return;
    }

    publish((count ?? 0) > 0);
  })().finally(() => {
    inFlightRequest = undefined;
  });

  return inFlightRequest;
}

export function useUnreadNotifications(revalidateKey: string) {
  const [hasUnread, setHasUnread] = useState(hasUnreadNotifications);

  useEffect(() => {
    listeners.add(setHasUnread);
    setHasUnread(hasUnreadNotifications);
    void refreshUnreadNotifications();

    const handleNotificationRead = () => {
      void refreshUnreadNotifications();
    };

    window.addEventListener("jtec-notification-read", handleNotificationRead);

    return () => {
      listeners.delete(setHasUnread);
      window.removeEventListener(
        "jtec-notification-read",
        handleNotificationRead,
      );
    };
  }, [revalidateKey]);

  return hasUnread;
}
