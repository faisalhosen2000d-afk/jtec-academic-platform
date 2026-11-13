"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  Upload,
  GraduationCap,
  Trophy,
  Calculator,
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
  { label: "CGPA Calculator", href: "/cgpa-calculator", icon: Calculator },
  { label: "Conversations", href: "/messages", icon: MessageSquare },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const hasUnreadNotifications = useUnreadNotifications(pathname);
  const hasUnreadMessages = useUnreadMessages(pathname);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const activePath = optimisticHref ?? pathname;

  const activeIndex = navigationItems.findIndex(
    (item) =>
      activePath === item.href ||
      (item.href !== "/dashboard" && activePath.startsWith(`${item.href}/`)),
  );

  useEffect(() => {
    const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
    if (el) {
      setPillStyle({ top: el.offsetTop, height: el.offsetHeight });
    }
  }, [activeIndex]);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-800/80 bg-[#060A12] text-slate-200 lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-16 items-center border-b border-slate-800/80 px-6">
        <Link
          href="/dashboard"
          prefetch={true}
          className="group flex items-center gap-3"
          aria-label="JTEC Academic Platform"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/50 bg-gradient-to-br from-emerald-400/25 to-cyan-500/20 font-serif text-sm font-bold text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.25)] transition-transform duration-200 group-hover:scale-105">
            J
          </div>

          <div>
            <p className="font-serif text-sm font-bold tracking-tight text-white">
              JTEC Academic
            </p>
            <p className="text-[11px] font-medium text-emerald-400/80">
              Student Portal
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Navigation
        </p>

        <div className="relative space-y-1">
          {/* Smooth Sliding Glowing Pill */}
          {pillStyle ? (
            <div
              aria-hidden="true"
              style={{
                transform: `translateY(${pillStyle.top}px)`,
                height: `${pillStyle.height}px`,
              }}
              className="pointer-events-none absolute inset-x-0 top-0 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.16)] transition-all duration-300 ease-out"
            />
          ) : null}

          {navigationItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = idx === activeIndex;
            const isNotifications = item.href === "/notifications";
            const isConversations = item.href === "/messages";

            return (
              <Link
                key={item.href}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                href={item.href}
                prefetch={true}
                onClick={() => {
                  if (pathname !== item.href) {
                    setOptimisticHref(item.href);
                  }
                }}
                className={[
                  "group relative z-10 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors duration-200",
                  isActive
                    ? "text-emerald-300"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-100",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isActive
                      ? "text-emerald-300"
                      : "text-slate-400 group-hover:text-cyan-300",
                  ].join(" ")}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden="true"
                />

                <span className="flex-1 tracking-tight">{item.label}</span>

                {isNotifications && hasUnreadNotifications && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                    aria-label="Unread notifications"
                  />
                )}

                {isConversations && hasUnreadMessages && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    aria-label="Unread messages"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-800/80 p-3">
        <div className="rounded-xl border border-slate-800/80 bg-[#0A1020] p-3.5">
          <p className="text-xs font-semibold text-white">
            JTEC Academic Platform
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Student Portal · Verified Access
          </p>
        </div>
      </div>
    </aside>
  );
}