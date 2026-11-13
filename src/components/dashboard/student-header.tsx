"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, LogOut, ExternalLink, Bell, ChevronDown } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { useUnreadNotifications } from "@/lib/use-unread-notifications";
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
  const [profile, setProfile] = useState<StudentProfilePreview | null>(
    cachedStudentProfile,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDropdownOpen(false);
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#060A12]/85 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/50 bg-emerald-500/15 font-serif text-sm font-bold text-emerald-300 shadow-sm"
            aria-label="JTEC Academic Platform"
          >
            J
          </Link>
        </div>

        <div>
          <h1 className="font-serif text-lg font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="hidden text-[11px] text-slate-400 sm:block">
            JTEC Academic Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications Icon */}
        <Link
          href="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0A1020] text-slate-300 transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.9} aria-hidden="true" />
          {hasUnreadNotifications && (
            <span
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)]"
              aria-label="Unread notifications"
            />
          )}
        </Link>

        {/* Profile Pill with Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0A1020] pl-1.5 pr-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-[#0D162B] focus:outline-none active:scale-95"
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

          {dropdownOpen && (
            <div
              className="absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-emerald-500/35 bg-[#0A1020] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
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
                  {profile?.departmentName} · {profile?.batchName}
                </p>

                <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-slate-400">
                  {profile?.email}
                </p>
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-800 pt-4">
                <Link
                  href="/profile"
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
          )}
        </div>
      </div>
    </header>
  );
}