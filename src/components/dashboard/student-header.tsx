"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  LogOut,
  ExternalLink,
  Bell,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  Bookmark,
  Upload,
  GraduationCap,
  Trophy,
  Calculator,
  MessageSquare,
} from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { useUnreadNotifications } from "@/lib/use-unread-notifications";
import { useUnreadMessages } from "@/lib/use-unread-messages";
import { createClient } from "@/lib/supabase/client";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/materials": "Materials",
  "/bookmarks": "Bookmarks",
  "/upload": "Upload",
  "/results": "Results",
  "/ranking": "Ranking",
  "/cgpa-calculator": "CGPA Calculator",
  "/messages": "Conversations",
  "/notifications": "Notifications",
  "/profile": "Profile",
};

const mobileNavItems = [
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

type StudentProfilePreview = {
  fullName: string;
  studentId: string;
  email: string;
  avatarUrl: string | null;
  departmentName: string;
  batchName: string;
};

let cachedStudentProfile: StudentProfilePreview | null = null;

export function StudentHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const hasUnreadNotifications = useUnreadNotifications(pathname);
  const hasUnreadMessages = useUnreadMessages(pathname);
  const [profile, setProfile] = useState<StudentProfilePreview | null>(
    cachedStudentProfile,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setDrawerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (cachedStudentProfile && pathname !== "/profile") {
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select(
          `
          full_name,
          student_id,
          avatar_url,
          email,
          department_id,
          batch_id
        `,
        )
        .eq("id", user.id)
        .maybeSingle();

      let departmentName = "Department";
      let batchName = "Batch";

      if (profileRow?.department_id) {
        const { data: dept } = await supabase
          .from("departments")
          .select("name")
          .eq("id", profileRow.department_id)
          .maybeSingle();
        if (dept?.name) departmentName = dept.name;
      }

      if (profileRow?.batch_id) {
        const { data: b } = await supabase
          .from("batches")
          .select("name")
          .eq("id", profileRow.batch_id)
          .maybeSingle();
        if (b?.name) batchName = b.name;
      }

      const previewData: StudentProfilePreview = {
        fullName:
          profileRow?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Student",
        studentId:
          profileRow?.student_id ||
          user.user_metadata?.student_id ||
          "Not assigned",
        email: profileRow?.email || user.email || "",
        avatarUrl: profileRow?.avatar_url ?? null,
        departmentName,
        batchName,
      };

      cachedStudentProfile = previewData;

      if (isMounted) {
        setProfile(previewData);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    cachedStudentProfile = null;
    await signOut();
    router.replace("/login");
    router.refresh();
  };

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([path]) =>
        path !== "/dashboard" && pathname.startsWith(`${path}/`),
    )?.[1] ??
    "Student Portal";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#060A12] px-3.5 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#0A1020] text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300 active:scale-95 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate font-serif text-base sm:text-lg font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="hidden text-[11px] text-slate-400 sm:block">
            JTEC Academic Platform
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        {/* Golden Notifications Bell Icon with Radiant Unread Glow */}
        <Link
          href="/notifications"
          prefetch={true}
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
            hasUnreadNotifications
              ? "border-amber-400/80 bg-amber-500/20 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.55)] ring-2 ring-amber-400/35 hover:bg-amber-500/25"
              : "border-amber-500/30 bg-[#0A1020] text-amber-300/85 hover:border-amber-400/65 hover:bg-amber-500/10 hover:text-amber-200"
          }`}
          aria-label="Notifications"
        >
          {hasUnreadNotifications && (
            <span
              className="pointer-events-none absolute -inset-1 rounded-xl bg-amber-400/20 blur-md animate-pulse"
              aria-hidden="true"
            />
          )}
          <Bell
            className={`relative h-4.5 w-4.5 ${hasUnreadNotifications ? "text-amber-300" : ""}`}
            strokeWidth={2}
            aria-hidden="true"
          />
          {hasUnreadNotifications && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.95)]"
              aria-label="Unread notifications"
            />
          )}
        </Link>

        {/* Profile Pill with Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-[#0A1020] pl-1.5 pr-2.5 sm:pr-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-[#0D162B] focus:outline-none active:scale-95"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="Open user profile menu"
          >
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-emerald-400/50 bg-emerald-500/15 text-xs font-bold text-emerald-300">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                profile?.fullName?.[0]?.toUpperCase() || "S"
              )}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-[130px] truncate text-xs font-semibold text-white">
                {profile?.fullName || "Student"}
              </p>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
                dropdownOpen ? "rotate-180 text-emerald-300" : ""
              }`}
            />
          </button>

          <div
            aria-hidden={!dropdownOpen}
            className={`absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-emerald-500/35 bg-[#0A1020] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.85)] transition-all duration-200 ease-out ${
              dropdownOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-95 opacity-0"
            }`}
            role="menu"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-emerald-400/50 bg-emerald-500/15 font-serif text-2xl font-bold text-emerald-300 shadow-lg">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profile?.fullName?.[0]?.toUpperCase() || "S"
                )}
              </div>

              <h3 className="mt-3 font-serif text-base font-bold text-white">
                {profile?.fullName || "Student"}
              </h3>

              <p className="mt-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-300">
                ID: {profile?.studentId || "N/A"}
              </p>

              <p className="mt-1.5 text-xs text-slate-300">
                {profile?.departmentName} &middot; {profile?.batchName}
              </p>

              <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-slate-400">
                {profile?.email}
              </p>
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-800 pt-4">
              <Link
                href="/profile"
                prefetch={true}
                onClick={() => setDropdownOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.28)] transition hover:from-emerald-300 hover:to-emerald-400 active:scale-95"
              >
                <User className="h-4 w-4" />
                <span>Go to Full Profile</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-75" />
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/25 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span>{signingOut ? "Signing out..." : "Logout"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-250 ${
              drawerOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!drawerOpen}
          >
            <div
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <aside
              className={`relative flex h-[100dvh] w-72 max-w-[82vw] flex-col border-r border-slate-800/90 bg-[#060A12] text-slate-200 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                drawerOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
                <Link
                  href="/dashboard"
                  prefetch={true}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/50 bg-gradient-to-br from-emerald-400/25 to-cyan-500/20 font-serif text-sm font-bold text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.25)]">
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

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0A1020] text-slate-400 transition hover:border-slate-700 hover:text-white active:scale-95"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Navigation
                </p>

                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(`${item.href}/`));
                  const isNotifications = item.href === "/notifications";
                  const isConversations = item.href === "/messages";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-xs font-semibold transition-all active:scale-[0.98] ${
                        isActive
                          ? "border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-transparent text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.16)]"
                          : isNotifications && hasUnreadNotifications
                            ? "border-amber-400/25 bg-amber-500/8 text-amber-200"
                            : "border-transparent text-slate-300 hover:bg-slate-900/60 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? "text-emerald-300"
                            : isNotifications && hasUnreadNotifications
                              ? "text-amber-300"
                              : "text-slate-400"
                        }`}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                      <span className="flex-1">{item.label}</span>

                      {isNotifications && hasUnreadNotifications && (
                        <span className="rounded-full border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                          New
                        </span>
                      )}

                      {isConversations && hasUnreadMessages && (
                        <span className="rounded-full border border-cyan-400/50 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                          New
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-slate-800/80 p-3">
                <div className="rounded-xl border border-slate-800/80 bg-[#0A1020] p-3">
                  <p className="text-xs font-semibold text-white">
                    JTEC Academic Platform
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Student Portal &middot; Verified Access
                  </p>
                </div>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  );
}