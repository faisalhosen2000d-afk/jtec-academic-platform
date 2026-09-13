"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/server/actions/auth";
import { useUnreadNotifications } from "@/lib/use-unread-notifications";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/materials": "Materials",
  "/folders": "Folders",
  "/bookmarks": "Bookmarks",
  "/upload": "Upload",
  "/results": "Results",
  "/ranking": "Ranking",
  "/notifications": "Notifications",
  "/profile": "Profile",
};

export function StudentHeader() {
  const pathname = usePathname();
  const hasUnreadNotifications = useUnreadNotifications(pathname);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([path]) =>
        path !== "/dashboard" &&
        pathname.startsWith(`${path}/`),
    )?.[1] ??
    "Student Portal";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
            aria-label="JTEC Academic Platform"
          >
            J
          </Link>
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>

          <p className="hidden text-xs text-muted-foreground sm:block">
            JTEC Academic Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17H9m9-6a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Zm-4.5 8a2 2 0 0 1-3 0"
            />
          </svg>

          {hasUnreadNotifications && (
            <span
              className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
              aria-label="Unread notifications"
            />
          )}
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
            aria-label="Open profile"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              S
            </div>

            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-foreground">
                Student
              </p>

              <p className="text-xs text-muted-foreground">
                My Profile
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
