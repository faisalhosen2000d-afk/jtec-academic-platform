"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadNotifications } from "@/lib/use-unread-notifications";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "Materials", href: "/materials", icon: "▣" },
  { label: "Folders", href: "/folders", icon: "▤" },
  { label: "Bookmarks", href: "/bookmarks", icon: "★" },
  { label: "Upload", href: "/upload", icon: "↑" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Ranking", href: "/ranking", icon: "♜" },
  { label: "Notifications", href: "/notifications", icon: "●" },
  { label: "Profile", href: "/profile", icon: "○" },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const hasUnreadNotifications = useUnreadNotifications(pathname);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          aria-label="JTEC Academic Platform"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
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
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Student
        </p>

        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            const isNotifications =
              item.href === "/notifications";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-5 w-5 items-center justify-center text-sm",
                    isActive ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span className="flex-1">{item.label}</span>

                {isNotifications && hasUnreadNotifications && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-destructive"
                    aria-label="Unread notifications"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <p className="text-xs font-medium text-foreground">
            JTEC Academic Platform
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Student access
          </p>
        </div>
      </div>
    </aside>
  );
}
