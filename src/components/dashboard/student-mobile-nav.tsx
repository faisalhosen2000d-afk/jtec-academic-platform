"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { useUnreadMessages } from "@/lib/use-unread-messages";

const mobileTabs = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Materials", href: "/materials", icon: BookOpen },
  { label: "Upload", href: "/upload", icon: Upload, isCenter: true },
  { label: "Results", href: "/results", icon: GraduationCap },
  { label: "Messages", href: "/messages", icon: MessageSquare },
];

export function StudentMobileNav() {
  const pathname = usePathname();
  const hasUnreadMessages = useUnreadMessages(pathname);

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/90 bg-[#060A12] lg:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(`${tab.href}/`));
          const isMessages = tab.href === "/messages";

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={true}
                className="flex flex-col items-center justify-center gap-0.5"
              >
                <span
                  className={`flex h-10 w-12 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
                    isActive
                      ? "border-emerald-400 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.45)]"
                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? "text-emerald-300" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors active:scale-95 ${
                isActive ? "text-emerald-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className="h-4.5 w-4.5" strokeWidth={isActive ? 2.2 : 1.8} />
                {isMessages && hasUnreadMessages && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-6 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}