"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, ExternalLink, Bell } from "lucide-react";
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
        .select(`
          full_name,
          student_id,
          avatar_url,
          email,
          department_id,
          batch_id
        `)
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
    cachedStudentProfile = null;
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
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm"
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
        {/* Notifications Icon */}
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          {hasUnreadNotifications && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"
              aria-label="Unread notifications"
            />
          )}
        </Link>

        {/* Profile Avatar with Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="Open user profile menu"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-sm font-bold text-primary shadow-xs">
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
              <p className="max-w-[120px] truncate text-xs font-semibold text-foreground">
                {profile?.fullName || "Student"}
              </p>
              <p className="text-[10px] text-muted-foreground">My Account</p>
            </div>
          </button>

          {/* Large Profile Dropdown Card */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-border bg-background p-5 shadow-2xl transition-all animate-in fade-in zoom-in-95"
              role="menu"
            >
              <div className="flex flex-col items-center text-center">
                {/* Large Profile Picture */}
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 text-2xl font-bold text-primary shadow-md">
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

                {/* Profile Details */}
                <h3 className="mt-3 text-base font-bold text-foreground">
                  {profile?.fullName || "Student"}
                </h3>

                <p className="mt-0.5 font-mono text-xs font-medium text-primary">
                  ID: {profile?.studentId || "N/A"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {profile?.departmentName} • {profile?.batchName}
                </p>

                <p className="mt-0.5 max-w-[240px] truncate text-xs text-muted-foreground">
                  {profile?.email}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  <User className="h-4 w-4" />
                  <span>Go to Full Profile</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>


      </div>
    </header>
  );
}