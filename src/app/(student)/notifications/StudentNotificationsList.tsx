"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  Megaphone,
  MessageSquare,
  Trash2,
} from "lucide-react";
import {
  deleteNotification,
  markNotificationAsRead,
} from "@/server/actions/notifications";

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

type FilterTab = "all" | "unread" | "notices" | "materials";

function getTypeIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("notice")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-300">
        <Megaphone className="h-4.5 w-4.5" />
      </div>
    );
  }
  if (t.includes("material") || t.includes("approved")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-300">
        <CheckCircle2 className="h-4.5 w-4.5" />
      </div>
    );
  }
  if (t.includes("message")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/15 text-cyan-300">
        <MessageSquare className="h-4.5 w-4.5" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300">
      <Bell className="h-4.5 w-4.5" />
    </div>
  );
}

export default function StudentNotificationsList({
  notifications: initialNotifications,
}: StudentNotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [readingId, setReadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadItems = useMemo(
    () => notifications.filter((n) => !n.is_read),
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterTab === "unread") return !n.is_read;
      if (filterTab === "notices") return n.type.toLowerCase().includes("notice");
      if (filterTab === "materials") {
        return (
          n.type.toLowerCase().includes("material") ||
          n.type.toLowerCase().includes("approved")
        );
      }
      return true;
    });
  }, [filterTab, notifications]);

  async function handleMarkAllRead() {
    if (markingAll || unreadItems.length === 0) return;
    setMarkingAll(true);

    const results = await Promise.all(
      unreadItems.map((item) => markNotificationAsRead(item.id)),
    );

    const succeededIds = new Set(
      unreadItems
        .filter((_, idx) => results[idx]?.success)
        .map((item) => item.id),
    );

    if (succeededIds.size > 0) {
      setNotifications((current) =>
        current.map((item) =>
          succeededIds.has(item.id) ? { ...item, is_read: true } : item,
        ),
      );
      window.dispatchEvent(new CustomEvent("jtec-notification-read"));
      router.refresh();
    }

    setMarkingAll(false);
  }

  async function handleDeleteNotification(notificationId: string) {
    if (deletingId === notificationId || readingId === notificationId) {
      return;
    }

    setDeletingId(notificationId);

    const result = await deleteNotification(notificationId);

    if (result.success) {
      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );

      window.dispatchEvent(new CustomEvent("jtec-notification-read"));
      router.refresh();
    }

    setDeletingId(null);
  }

  async function handleNotificationClick(
    notification: NotificationItem,
    shouldNavigate = false,
  ) {
    if (readingId === notification.id || deletingId === notification.id) {
      return;
    }

    if (!notification.is_read) {
      setReadingId(notification.id);

      const result = await markNotificationAsRead(notification.id);

      if (result.success) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
          ),
        );

        window.dispatchEvent(new CustomEvent("jtec-notification-read"));
      }

      setReadingId(null);
    }

    if (shouldNavigate && notification.link_url) {
      router.push(notification.link_url);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter & Mark All Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-3.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "all", label: `All (${notifications.length})` },
              { id: "unread", label: `Unread (${unreadItems.length})` },
              { id: "notices", label: "Notices" },
              { id: "materials", label: "Materials" },
            ] as const
          ).map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                    : "border-slate-800 bg-[#0E172A] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {unreadItems.length > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void handleMarkAllRead()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markingAll ? "Marking..." : "Mark All Read"}
          </button>
        )}
      </div>

      {/* Notification Cards */}
      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/60 p-10 text-center">
          <p className="font-serif text-base font-bold text-white">
            No notifications in this filter
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Switch to &quot;All&quot; to view your complete activity history.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <div
              key={notification.id}
              onClick={() => void handleNotificationClick(notification)}
              style={{
                animation: "dashFadeUp 0.4s ease-out both",
                animationDelay: `${Math.min(index, 10) * 45 + 100}ms`,
              }}
              className={`cursor-pointer rounded-2xl border p-4 sm:p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${
                !notification.is_read
                  ? "border-cyan-500/35 bg-gradient-to-r from-cyan-500/8 via-[#0A1020] to-[#0A1020] hover:border-cyan-400/60"
                  : "border-slate-800/90 bg-[#0A1020] hover:border-slate-700 hover:bg-[#0D162B]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                {getTypeIcon(notification.type)}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white sm:text-base">
                        {notification.title}
                      </h2>
                      {!notification.is_read && (
                        <span
                          aria-hidden="true"
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-cyan-400"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!notification.is_read && (
                        <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                          New
                        </span>
                      )}
                      <p
                        suppressHydrationWarning
                        className="text-[11px] text-slate-400"
                      >
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone: "Asia/Dhaka",
                          dateStyle: "short",
                          timeStyle: "medium",
                        }).format(new Date(notification.created_at))}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-300">
                    {notification.body}
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-3">
                    {notification.link_url && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleNotificationClick(notification, true);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/65 hover:bg-cyan-500/20"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={deletingId === notification.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteNotification(notification.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deletingId === notification.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}