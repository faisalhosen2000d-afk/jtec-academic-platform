"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteNotification, markNotificationAsRead } from "@/server/actions/notifications";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

type StudentNotificationsListProps = {
  notifications: NotificationItem[];
};

export default function StudentNotificationsList({
  notifications: initialNotifications,
}: StudentNotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState(initialNotifications);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteNotification(
    notificationId: string,
  ) {
    if (deletingId === notificationId || readingId === notificationId) {
      return;
    }

    setDeletingId(notificationId);

    const result = await deleteNotification(notificationId);

    if (result.success) {
      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );

      window.dispatchEvent(
        new CustomEvent("jtec-notification-read"),
      );

      router.refresh();
    }

    setDeletingId(null);
  }

  async function handleNotificationClick(
    notification: NotificationItem,
  ) {
    if (notification.is_read || readingId === notification.id || deletingId === notification.id) {
      return;
    }

    setReadingId(notification.id);

    const result = await markNotificationAsRead(notification.id);

    if (result.success) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item,
        ),
      );

      window.dispatchEvent(
        new CustomEvent("jtec-notification-read"),
      );

      router.refresh();
    }

    setReadingId(null);
  }

  return (
    <div className="divide-y divide-border">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => handleNotificationClick(notification)}
          className={`cursor-pointer py-5 first:pt-0 last:pb-0 ${
            !notification.is_read
              ? "rounded-lg bg-muted/40 px-4"
              : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                notification.is_read
                  ? "bg-transparent"
                  : "bg-foreground"
              }`}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">
                    {notification.title}
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: "Asia/Dhaka",
                      dateStyle: "short",
                      timeStyle: "medium",
                    }).format(new Date(notification.created_at))}
                  </p>
                </div>

                {!notification.is_read && (
                  <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                    New
                  </span>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {notification.body}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                {notification.link_url && (
                  <Link
                    href={notification.link_url}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleNotificationClick(notification);
                    }}
                    className="text-sm font-medium text-foreground underline underline-offset-4"
                  >
                    Open
                  </Link>
                )}

                <button
                  type="button"
                  disabled={deletingId === notification.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDeleteNotification(notification.id);
                  }}
                  className="text-sm font-medium text-destructive underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === notification.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
