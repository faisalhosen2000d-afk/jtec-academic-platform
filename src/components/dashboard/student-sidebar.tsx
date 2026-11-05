"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  Upload,
  GraduationCap,
  Trophy,
  MessageSquare,
  Bell,
  User,
} from "lucide-react";
import { useUnreadNotifications } from "@/lib/use-unread-notifications";
import { useUnreadMessages } from "@/lib/use-unread-messages";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Materials", href: "/materials", icon: BookOpen },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "Results", href: "/results", icon: GraduationCap },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Conversations", href: "/messages", icon: MessageSquare },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const hasUnreadNotifications = useUnreadNotifications(pathname);
  const hasUnreadMessages = useUnreadMessages(pathname);

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const activePath = optimisticHref ?? pathname;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link
          href="/dashboard"
          prefetch={true}
          className="flex items-center gap-3"
          aria-label="JTEC Academic Platform"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            J
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              JTEC Academic
            </p>
            <p className="text-xs text-muted-foreground">
              Student Portal
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          Student
        </p>

        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activePath === item.href ||
              (item.href !== "/dashboard" &&
                activePath.startsWith(`${item.href}/`));

            const isNotifications = item.href === "/notifications";
            const isConversations = item.href === "/messages";

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => {
                  if (pathname !== item.href) {
                    setOptimisticHref(item.href);
                  }
                }}
                className={[
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 font-semibold text-primary shadow-xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  ].join(" ")}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden="true"
                />

                <span className="flex-1 tracking-tight">{item.label}</span>

                {isNotifications && hasUnreadNotifications && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-destructive ring-2 ring-background"
                    aria-label="Unread notifications"
                  />
                )}

                {isConversations && hasUnreadMessages && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-destructive ring-2 ring-background"
                    aria-label="Unread messages"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-semibold text-foreground">
            JTEC Academic Platform
          </p>

          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Student Portal v1.2
          </p>
        </div>
      </div>
    </aside>
  );
}