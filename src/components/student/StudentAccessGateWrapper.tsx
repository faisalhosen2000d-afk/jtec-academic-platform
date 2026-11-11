"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isRouteAllowedForPendingStudent } from "@/lib/permissions/verification-gate";
import { StudentVerificationRestrictedView } from "@/components/student/StudentVerificationRestrictedView";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";

const ROUTE_TITLES: Record<string, string> = {
  "/materials": "Academic Materials Vault",
  "/bookmarks": "Saved Bookmarks",
  "/upload": "Material Upload Center",
  "/results": "Official Semester Results",
  "/ranking": "Department Merit Ranking",
  "/cgpa-calculator": "Interactive CGPA Calculator",
  "/messages": "Student Conversations",
  "/notifications": "Campus Notifications",
};

export function StudentAccessGateWrapper({
  children,
  isApproved,
  verificationStatus,
  rejectionReason,
}: {
  children: ReactNode;
  isApproved: boolean;
  verificationStatus?: string;
  rejectionReason?: string | null;
}) {
  const pathname = usePathname();

  // Approved students or Staff get full unrestricted access
  if (isApproved) {
    return <>{children}</>;
  }

  // Pending / Rejected students: Check Explicit Allow list (/dashboard, /profile)
  if (isRouteAllowedForPendingStudent(pathname)) {
    return <>{children}</>;
  }

  // Default Deny for all other current and future routes:
  // Render Page Frame (Sidebar + Header) with Restricted View Card
  const matchedKey = Object.keys(ROUTE_TITLES).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`)
  );
  const featureTitle = matchedKey ? ROUTE_TITLES[matchedKey] : "Academic Module";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <StudentSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-card/50">
          <h1 className="text-lg font-bold tracking-tight">{featureTitle}</h1>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400">
            Verification Pending
          </span>
        </header>
        <main className="flex-1 p-6 flex items-center justify-center">
          <StudentVerificationRestrictedView
            featureName={featureTitle}
            status={verificationStatus}
            rejectionReason={rejectionReason}
          />
        </main>
      </div>
    </div>
  );
}
